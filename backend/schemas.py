from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, Dict, Any, List

class SignupRequest(BaseModel):
    employee_id: str = Field(..., min_length=1, description="Unique Employee Identifier")
    first_name: str = Field(..., min_length=1, description="First name")
    last_name: str = Field(..., min_length=1, description="Last name")
    email: EmailStr = Field(..., description="Corporate email address")
    password: str = Field(..., min_length=8, description="Password meeting security criteria")
    role: Literal['HR_ADMIN', 'EMPLOYEE'] = Field(default='EMPLOYEE', description="Assigned Role")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=1, description="User password")

class VerifyEmailRequest(BaseModel):
    token: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    employee_id: str
    first_name: str
    last_name: str
    email: str
    role: str
    is_verified: bool
    created_at: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: UserResponse

class GenericResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
