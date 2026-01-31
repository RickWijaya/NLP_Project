"""
Analytics router for tracking and reporting usage metrics.
Provides endpoints for analytics dashboard.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel

from app.database import get_db
from app.models.document import Admin, ChatMessage, ChatSession, Document
from app.auth.dependencies import get_current_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ============================================================================
# Schemas
# ============================================================================

class DailyMetric(BaseModel):
    date: str
    count: int


class TenantStats(BaseModel):
    tenant_id: str
    total_chats: int
    total_messages: int
    total_users: int
    total_documents: int
    avg_response_time_ms: Optional[float]


class AnalyticsSummary(BaseModel):
    total_messages: int
    total_sessions: int
    total_users: int
    total_documents: int
    messages_today: int
    messages_this_week: int
    daily_messages: List[DailyMetric]


class SuperAdminStats(BaseModel):
    total_tenants: int
    total_messages: int
    total_users: int
    total_documents: int
    tenants: List[TenantStats]


# ============================================================================
# Admin Analytics (Tenant-scoped)
# ============================================================================

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics summary for the current tenant."""
    tenant_id = admin.tenant_id
    
    # Total messages
    msg_result = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession)
        .where(ChatSession.tenant_id == tenant_id)
    )
    total_messages = msg_result.scalar() or 0
    
    # Total sessions
    session_result = await db.execute(
        select(func.count(ChatSession.id))
        .where(ChatSession.tenant_id == tenant_id)
    )
    total_sessions = session_result.scalar() or 0
    
    # Total users (count unique user_identifiers from sessions)
    user_result = await db.execute(
        select(func.count(func.distinct(ChatSession.user_identifier)))
        .where(ChatSession.tenant_id == tenant_id)
    )
    total_users = user_result.scalar() or 0
    
    # Total documents
    doc_result = await db.execute(
        select(func.count(Document.id))
        .where(Document.tenant_id == tenant_id)
    )
    total_documents = doc_result.scalar() or 0
    
    # Messages today
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_result = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession)
        .where(and_(
            ChatSession.tenant_id == tenant_id,
            ChatMessage.created_at >= today_start
        ))
    )
    messages_today = today_result.scalar() or 0
    
    # Messages this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_result = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession)
        .where(and_(
            ChatSession.tenant_id == tenant_id,
            ChatMessage.created_at >= week_ago
        ))
    )
    messages_this_week = week_result.scalar() or 0
    
    # Daily messages for last 7 days
    daily_messages = []
    for i in range(7):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_result = await db.execute(
            select(func.count(ChatMessage.id))
            .join(ChatSession)
            .where(and_(
                ChatSession.tenant_id == tenant_id,
                ChatMessage.created_at >= day_start,
                ChatMessage.created_at <= day_end
            ))
        )
        count = day_result.scalar() or 0
        daily_messages.append(DailyMetric(date=day.isoformat(), count=count))
    
    daily_messages.reverse()  # Oldest first
    
    return AnalyticsSummary(
        total_messages=total_messages,
        total_sessions=total_sessions,
        total_users=total_users,
        total_documents=total_documents,
        messages_today=messages_today,
        messages_this_week=messages_this_week,
        daily_messages=daily_messages
    )


# ============================================================================
# Super Admin Analytics (All tenants)
# ============================================================================

@router.get("/superadmin/stats", response_model=SuperAdminStats)
async def get_superadmin_stats(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system-wide analytics. Requires super admin."""
    if not admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    # Get all tenants
    admins_result = await db.execute(select(Admin))
    all_admins = admins_result.scalars().all()
    
    tenants_stats = []
    total_messages = 0
    total_users = 0
    total_documents = 0
    
    for tenant_admin in all_admins:
        tid = tenant_admin.tenant_id
        
        # Messages for tenant
        msg_result = await db.execute(
            select(func.count(ChatMessage.id))
            .join(ChatSession)
            .where(ChatSession.tenant_id == tid)
        )
        tenant_msgs = msg_result.scalar() or 0
        total_messages += tenant_msgs
        
        # Sessions for tenant
        sess_result = await db.execute(
            select(func.count(ChatSession.id))
            .where(ChatSession.tenant_id == tid)
        )
        tenant_sessions = sess_result.scalar() or 0
        
        # Users for tenant (unique user_identifiers)
        user_result = await db.execute(
            select(func.count(func.distinct(ChatSession.user_identifier)))
            .where(ChatSession.tenant_id == tid)
        )
        tenant_users = user_result.scalar() or 0
        total_users += tenant_users
        
        # Documents for tenant
        doc_result = await db.execute(
            select(func.count(Document.id))
            .where(Document.tenant_id == tid)
        )
        tenant_docs = doc_result.scalar() or 0
        total_documents += tenant_docs
        
        tenants_stats.append(TenantStats(
            tenant_id=tid,
            total_chats=tenant_sessions,
            total_messages=tenant_msgs,
            total_users=tenant_users,
            total_documents=tenant_docs,
            avg_response_time_ms=None
        ))
    
    return SuperAdminStats(
        total_tenants=len(all_admins),
        total_messages=total_messages,
        total_users=total_users,
        total_documents=total_documents,
        tenants=tenants_stats
    )


@router.get("/superadmin/tenants")
async def get_all_tenants(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get list of all tenants. Requires super admin."""
    if not admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    result = await db.execute(
        select(Admin).order_by(Admin.created_at.desc())
    )
    admins = result.scalars().all()
    
    return {
        "tenants": [
            {
                "id": str(a.id),
                "tenant_id": a.tenant_id,
                "username": a.username,
                "email": a.email,
                "business_name": a.business_name,
                "is_active": a.is_active,
                "is_super_admin": a.is_super_admin if hasattr(a, 'is_super_admin') else False,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in admins
        ]
    }


@router.put("/superadmin/tenants/{tenant_id}/toggle")
async def toggle_tenant_status(
    tenant_id: str,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Enable/disable a tenant. Requires super admin."""
    if not admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    result = await db.execute(
        select(Admin).where(Admin.tenant_id == tenant_id)
    )
    target_admin = result.scalar_one_or_none()
    
    if not target_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    target_admin.is_active = not target_admin.is_active
    await db.commit()
    
    return {
        "tenant_id": tenant_id,
        "is_active": target_admin.is_active,
        "message": f"Tenant {'enabled' if target_admin.is_active else 'disabled'}"
    }
