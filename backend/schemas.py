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
    monthly_wage: Optional[float] = None
    salary_base: Optional[float] = None
    salary_allowances: Optional[float] = None
    salary_deductions: Optional[float] = None
    basic_pct: Optional[float] = None
    hra_pct: Optional[float] = None
    standard_allowance_pct: Optional[float] = None
    performance_bonus_pct: Optional[float] = None
    lta_pct: Optional[float] = None
    pf_pct: Optional[float] = None
    professional_tax: Optional[float] = None
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

# Payroll Schemas (Phase 1 & 2 Granular Salary Engine)
class AdminAdjustPayrollSchema(BaseModel):
    monthly_wage: Optional[float] = Field(default=None, ge=0)
    salary_base: Optional[float] = Field(default=None, ge=0)
    salary_allowances: Optional[float] = Field(default=None, ge=0)
    salary_deductions: Optional[float] = Field(default=None, ge=0)
    basic_pct: Optional[float] = Field(default=0.50, ge=0, le=1.0)
    hra_pct: Optional[float] = Field(default=0.50, ge=0, le=1.0)
    standard_allowance_pct: Optional[float] = Field(default=0.05, ge=0, le=1.0)
    performance_bonus_pct: Optional[float] = Field(default=0.05, ge=0, le=1.0)
    lta_pct: Optional[float] = Field(default=0.05, ge=0, le=1.0)
    pf_pct: Optional[float] = Field(default=0.12, ge=0, le=1.0)
    professional_tax: Optional[float] = Field(default=200.00, ge=0)
