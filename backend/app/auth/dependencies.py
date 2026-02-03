"""
FastAPI dependencies for authentication.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth.jwt_handler import decode_access_token
from app.models.document import Admin

# Security scheme
security = HTTPBearer()


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """
    Dependency to get the current authenticated admin.
    
    Args:
        credentials: Bearer token from request header
        db: Database session
        
    Returns:
        Admin model instance
        
    Raises:
        HTTPException: If token is invalid or admin not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise credentials_exception
    
    admin_id: str = payload.get("sub")
    if admin_id is None:
        raise credentials_exception
    
    # Get admin from database
    result = await db.execute(
        select(Admin).where(Admin.id == admin_id)
    )
    admin = result.scalar_one_or_none()
    
    if admin is None:
        raise credentials_exception
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled"
        )
    
    return admin


async def get_current_tenant_id(
    admin: Admin = Depends(get_current_admin)
) -> str:
    """
    Dependency to get the current tenant ID from the authenticated admin.
    
    Args:
        admin: Current authenticated admin
        
    Returns:
        Tenant ID string
    """
    return admin.tenant_id
