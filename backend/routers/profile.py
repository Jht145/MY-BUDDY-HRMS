from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import sqlite3

from backend.db import get_db
from backend.middleware import get_current_user, require_role

router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Profile Management"],
    dependencies=[Depends(get_current_user)]
)

class SelfProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None

class AdminProfileUpdate(BaseModel):
    job_title: Optional[str] = None
    department: Optional[str] = None
    base_salary: Optional[float] = None
    leave_balance_paid: Optional[int] = None
    leave_balance_sick: Optional[int] = None

@router.get("/")
@router.get("")
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Fetch comprehensive profile details for the logged-in user.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, employee_id, first_name, last_name, email, role, phone, address, profile_picture_url,
               job_title, department, joining_date, base_salary, leave_balance_paid, leave_balance_sick,
               is_verified, created_at
        FROM users WHERE id = ?
    """, (current_user["user_id"],))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Profile not found."}
        )

    return {
        "success": True,
        "profile": {
            "id": user["id"],
            "employee_id": user["employee_id"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "full_name": f"{user['first_name']} {user['last_name']}",
            "email": user["email"],
            "role": user["role"],
            "phone": user["phone"] or "Not provided",
            "address": user["address"] or "Not provided",
            "profile_picture_url": user["profile_picture_url"],
            "job_title": user["job_title"],
            "department": user["department"],
            "joining_date": user["joining_date"],
            "base_salary": float(user["base_salary"] or 0),
            "leave_balance_paid": user["leave_balance_paid"],
            "leave_balance_sick": user["leave_balance_sick"],
            "is_verified": bool(user["is_verified"]),
            "created_at": user["created_at"]
        }
    }

@router.patch("/self")
async def update_self_profile(
    payload: SelfProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Employee self-service update limited to personal contact info.
    """
    cursor = db.cursor()
    updates = []
    params = []

    if payload.phone is not None:
        updates.append("phone = ?")
        params.append(payload.phone.strip())
    if payload.address is not None:
        updates.append("address = ?")
        params.append(payload.address.strip())
    if payload.profile_picture_url is not None:
        updates.append("profile_picture_url = ?")
        params.append(payload.profile_picture_url.strip())

    if not updates:
        return {"success": True, "message": "No profile updates submitted."}

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(current_user["user_id"])

    cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()

    return {
        "success": True,
        "message": "Personal profile updated successfully."
    }

@router.patch("/admin/{target_user_id}")
async def admin_update_profile(
    target_user_id: int,
    payload: AdminProfileUpdate,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin endpoint to edit organizational data (job_title, department, salary, leave balances).
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, email FROM users WHERE id = ?", (target_user_id,))
    target = cursor.fetchone()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Target employee not found."}
        )

    updates = []
    params = []

    if payload.job_title is not None:
        updates.append("job_title = ?")
        params.append(payload.job_title.strip())
    if payload.department is not None:
        updates.append("department = ?")
        params.append(payload.department.strip())
    if payload.base_salary is not None:
        updates.append("base_salary = ?")
        params.append(payload.base_salary)
    if payload.leave_balance_paid is not None:
        updates.append("leave_balance_paid = ?")
        params.append(payload.leave_balance_paid)
    if payload.leave_balance_sick is not None:
        updates.append("leave_balance_sick = ?")
        params.append(payload.leave_balance_sick)

    if not updates:
        return {"success": True, "message": "No administrative updates provided."}

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(target_user_id)

    cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()

    return {
        "success": True,
        "message": f"Administrative updates applied to employee {target['email']}."
    }
