"""
User model for chat users (customers/end-users).
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

class User(Base):
    """User model for chat authentication (non-admin)."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    tenant_id = Column(String(100), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # We don't enforce unique email globally, but unique per tenant would be ideal.
    # However, for simplicity and standard auth, unique email globally or (email, tenant) tuple.
    # Let's enforce unique email globally for now to keep it simple, or checking logic in router.
    # Actually, often a user might use the same email for different tenants.
    # Let's just index it for now and handle uniqueness logic in the router or via a composite constraint if needed.
    # For this implementation, I will assume email + tenant_id should be unique, but let's just make email distinct for now to avoid confusion.
    
    def __repr__(self):
        return f"<User(email={self.email}, tenant_id={self.tenant_id})>"
