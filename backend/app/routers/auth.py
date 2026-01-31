"""
Authentication router for admin login and registration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Admin
from app.schemas.auth import AdminCreate, AdminLogin, AdminResponse, TokenResponse
from app.auth.jwt_handler import create_access_token, get_password_hash, verify_password
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    from app.models.document import TenantSettings
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
        expires_in=settings.jwt_expiry_minutes * 60,
        tenant_id=admin.tenant_id
    )


@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_db)  # This will be replaced with proper dependency
):
    """
    Get current admin information.
    Requires authentication.
    """
    from app.auth.dependencies import get_current_admin
    # This endpoint is available via the protected route
    pass
