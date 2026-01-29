"""
Authentication router for admin and user login/registration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models.document import Admin, User, TenantSettings
from app.schemas.auth import (
    AdminCreate, AdminLogin, AdminResponse, TokenResponse,
    UserCreate, UserLogin, UserResponse, UserTokenResponse
)
from app.auth.jwt_handler import create_access_token, get_password_hash, verify_password
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================================================
# Admin Authentication (Business Owners)
# ============================================================================

@router.post("/register", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def register_admin(
    admin_data: AdminCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new admin/business account.
    
    Creates a new tenant with default AI settings.
    """
    # Check if username already exists
    result = await db.execute(
        select(Admin).where(Admin.username == admin_data.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    result = await db.execute(
        select(Admin).where(Admin.email == admin_data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if tenant_id already exists
    result = await db.execute(
        select(Admin).where(Admin.tenant_id == admin_data.tenant_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant ID already in use. Please choose a different one."
        )
    
    # Create new admin
    hashed_password = get_password_hash(admin_data.password)
    
    admin = Admin(
        username=admin_data.username,
        email=admin_data.email,
        hashed_password=hashed_password,
        tenant_id=admin_data.tenant_id,
        business_name=admin_data.business_name
    )
    
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    
    # Create default tenant settings
    tenant_settings = TenantSettings(tenant_id=admin.tenant_id)
    db.add(tenant_settings)
    await db.commit()
    
    return admin


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: AdminLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate admin and return JWT token.
    """
    # Find admin by username
    result = await db.execute(
        select(Admin).where(Admin.username == login_data.username)
    )
    admin = result.scalar_one_or_none()
    
    if not admin or not verify_password(login_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled"
        )
    
    # Create access token
    token_data = {
        "sub": str(admin.id),
        "username": admin.username,
        "tenant_id": admin.tenant_id
    }
    
    access_token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiry_minutes * 60
    )


# ============================================================================
# User Authentication (Public Chat Users)
# ============================================================================

@router.post("/user/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user for public chat.
    
    Users are associated with a specific tenant.
    """
    # Check if tenant exists
    result = await db.execute(
        select(Admin).where(Admin.tenant_id == user_data.tenant_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found. Please check the tenant ID."
        )
    
    # Check if email already exists for this tenant
    result = await db.execute(
        select(User).where(
            and_(
                User.email == user_data.email,
                User.tenant_id == user_data.tenant_id
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered for this tenant"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        tenant_id=user_data.tenant_id
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/user/login", response_model=UserTokenResponse)
async def user_login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return JWT token for chat sessions.
    """
    # Find user by email and tenant
    result = await db.execute(
        select(User).where(
            and_(
                User.email == login_data.email,
                User.tenant_id == login_data.tenant_id
            )
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create access token with user type
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user.tenant_id,
        "user_type": "user"
    }
    
    access_token = create_access_token(token_data)
    
    return UserTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expiry_minutes * 60,
        user=UserResponse.model_validate(user)
    )


@router.get("/user/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user information. Requires user authentication.
    """
    # This is a placeholder - actual implementation needs the auth dependency
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required"
    )


@router.get("/tenant/{tenant_id}/info")
async def get_tenant_info(
    tenant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get public tenant information for chat UI.
    """
    result = await db.execute(
        select(Admin).where(Admin.tenant_id == tenant_id)
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return {
        "tenant_id": admin.tenant_id,
        "business_name": admin.business_name or admin.tenant_id,
        "is_active": admin.is_active
    }

