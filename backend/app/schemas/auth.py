"""
Pydantic schemas for authentication.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field, EmailStr


class AdminCreate(BaseModel):
    """Schema for admin/business registration."""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    tenant_id: str = Field(..., min_length=1, max_length=100, description="Unique identifier for this business")
    business_name: Optional[str] = Field(None, max_length=255, description="Business/company name")


class AdminLogin(BaseModel):
    """Schema for admin login."""
    username: str
    password: str


class AdminResponse(BaseModel):
    """Schema for admin response (no password)."""
    id: UUID
    username: str
    email: str
    tenant_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    tenant_id: str  # Required for frontend tenant isolation


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: str  # admin id
    username: str
    tenant_id: str
    exp: int
