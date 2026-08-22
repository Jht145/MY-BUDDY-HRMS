from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date, time, datetime

# Prompt 1: Relational Schema & Exact Data Field Dictionary Schemas

class UserSignUpSchema(BaseModel):
    employee_id: str = Field(..., min_length=2, description="Unique Employee ID (e.g. EMP-101)")
    first_name: str = Field(..., min_length=1, description="First name")
    last_name: str = Field(..., min_length=1, description="Last name")
    email: EmailStr = Field(..., description="Unique corporate work email")
    password: str = Field(..., min_length=8, description="Strong password")
    role: Literal["EMPLOYEE", "HR_ADMIN"] = Field(default="EMPLOYEE", description="System Role")

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailSchema(BaseModel):
    token: str

class EmployeeSelfProfileUpdateSchema(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None

class AdminProfileUpdateSchema(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    documents_url: Optional[str] = None
    salary_base: Optional[float] = None
    salary_allowances: Optional[float] = None
    salary_deductions: Optional[float] = None
    leave_balance_paid: Optional[int] = None
    leave_balance_sick: Optional[int] = None

# Attendance Schemas
class KioskCheckInSchema(BaseModel):
    check_in_photo_url: str = Field(..., description="Webcam snapshot capture URL or Base64 data")
    check_in_latitude: float = Field(..., description="GPS Device Latitude")
    check_in_longitude: float = Field(..., description="GPS Device Longitude")

class KioskCheckOutSchema(BaseModel):
    check_out_photo_url: Optional[str] = None

class AdminVerifyAttendanceSchema(BaseModel):
    approval_status: Literal["APPROVED", "REJECTED"]
    admin_comment: Optional[str] = None

# Leave Schemas
class LeaveApplySchema(BaseModel):
    leave_type: Literal["PAID", "SICK", "UNPAID"]
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    leave_reason: str = Field(..., min_length=3)

class AdminActionLeaveSchema(BaseModel):
    leave_status: Literal["APPROVED", "REJECTED"]
    admin_comment: Optional[str] = None

# Payroll Schemas
class AdminAdjustPayrollSchema(BaseModel):
    salary_base: float = Field(..., ge=0)
    salary_allowances: float = Field(default=0.0, ge=0)
    salary_deductions: float = Field(default=0.0, ge=0)
