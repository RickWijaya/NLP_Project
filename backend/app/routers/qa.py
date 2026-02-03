import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_db
from app.models.document import QARule, Admin
from app.auth.dependencies import get_current_admin
from app.utils.logger import logger

router = APIRouter(prefix="/admin/qa-rules", tags=["QA Rules"])

# --- Schemas ---

class QARuleBase(BaseModel):
    trigger_text: str = Field(..., min_length=1, description="The user question or keyword to match")
    answer_text: str = Field(..., min_length=1, description="The hardcoded answer to return")
    match_type: str = Field("contains", description="Match type: 'exact' or 'contains'")
    is_active: bool = True

class QARuleCreate(QARuleBase):
    pass

class QARuleUpdate(QARuleBase):
    pass

class QARuleResponse(QARuleBase):
    id: uuid.UUID
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/", response_model=List[QARuleResponse])
async def list_qa_rules(
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all Q&A rules for the current admin's tenant."""
    query = select(QARule).where(QARule.tenant_id == current_admin.tenant_id).order_by(QARule.created_at.desc())
    result = await db.execute(query)
    rules = result.scalars().all()
    return rules

@router.post("/", response_model=QARuleResponse)
async def create_qa_rule(
    rule_in: QARuleCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new Q&A rule."""
    new_rule = QARule(
        tenant_id=current_admin.tenant_id,
        trigger_text=rule_in.trigger_text,
        answer_text=rule_in.answer_text,
        match_type=rule_in.match_type,
        is_active=rule_in.is_active
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule

@router.put("/{rule_id}", response_model=QARuleResponse)
async def update_qa_rule(
    rule_id: uuid.UUID,
    rule_update: QARuleUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing Q&A rule."""
    query = select(QARule).where(QARule.id == rule_id, QARule.tenant_id == current_admin.tenant_id)
    result = await db.execute(query)
    rule = result.scalar_one_or_none()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    rule.trigger_text = rule_update.trigger_text
    rule.answer_text = rule_update.answer_text
    rule.match_type = rule_update.match_type
    rule.is_active = rule_update.is_active
    
    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_qa_rule(
    rule_id: uuid.UUID,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a Q&A rule."""
    query = select(QARule).where(QARule.id == rule_id, QARule.tenant_id == current_admin.tenant_id)
    result = await db.execute(query)
    rule = result.scalar_one_or_none()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    await db.delete(rule)
    await db.commit()
    return None
