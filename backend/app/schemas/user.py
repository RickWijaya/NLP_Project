from pydantic import BaseModel, EmailStr, field_validator
from typing import Any

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    tenant_id: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    tenant_id: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    tenant_id: str
    is_active: bool

    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v: Any) -> str:
        return str(v)

    class Config:
        from_attributes = True

class UserTokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    tenant_id: str
