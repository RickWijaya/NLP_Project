"""
Authentication router for chat user login and registration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserTokenResponse
from app.auth.jwt_handler import create_access_token, get_password_hash, verify_password
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/auth/user", tags=["User Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new chat user.
    """
    # Check if user with same email AND tenant_id exists
    # We scope users to tenants usually, or globally. 
    # Let's scope to tenant for now to avoid cross-tenant confusion if two tenants have same user email.
    result = await db.execute(
        select(User).where(
            User.email == user_data.email, 
            User.tenant_id == user_data.tenant_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered for this tenant"
        )
    
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


@router.post("/login", response_model=UserTokenResponse)
async def login_user(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate chat user and return JWT token.
    """
    result = await db.execute(
        select(User).where(
            User.email == login_data.email,
            User.tenant_id == login_data.tenant_id
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
    
    # Create access token
    # We use "sub" as user_id, and add a flag to distinguish from admins if needed.
    # But usually the JWT structure is standard. 
    # To distinguish, we can look up the user by ID in User table first.
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user.tenant_id,
        "role": "user" # Explicit role claim
    }
    
    access_token = create_access_token(token_data)
    
    return UserTokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=str(user.id),
        email=user.email,
        tenant_id=user.tenant_id
    )
