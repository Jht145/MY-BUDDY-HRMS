import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from backend.db import get_db
from backend.middleware import get_current_user, require_role
from backend.schemas import EmployeeSelfProfileUpdateSchema, AdminProfileUpdateSchema

router = APIRouter(
    prefix="/api/v1/profile",
    tags=["Employee Profile Management (Prompt 5)"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/")
@router.get("")
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Prompt 5.1: Profile View Component:
    Render profile_picture_url, first_name, last_name, employee_id, email, phone, address,
    job_title, department, joining_date, and documents_url alongside protected salary keys (salary_base, net_salary).
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, employee_id, first_name, last_name, email, role, phone, address, profile_picture_url,
               job_title, department, joining_date, documents_url, salary_base, salary_allowances,
               salary_deductions, net_salary, leave_balance_paid, leave_balance_sick, is_email_verified, created_at
        FROM users WHERE id = ?
    """, (current_user["user_id"],))
    u = cursor.fetchone()

    if not u:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Profile not found."}
        )

    return {
        "success": True,
        "profile": {
            "user_id": u["id"],
            "employee_id": u["employee_id"],
            "first_name": u["first_name"],
            "last_name": u["last_name"],
            "full_name": f"{u['first_name']} {u['last_name']}",
            "email": u["email"],
            "role": u["role"],
            "phone": u["phone"] or "Not provided",
            "address": u["address"] or "Not provided",
            "profile_picture_url": u["profile_picture_url"] or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "job_title": u["job_title"],
            "department": u["department"],
            "joining_date": u["joining_date"],
            "documents_url": u["documents_url"] or "https://mybuddyhrms.com/docs/employee_records.pdf",
            "salary_base": float(u["salary_base"] or 0),
            "salary_allowances": float(u["salary_allowances"] or 0),
            "salary_deductions": float(u["salary_deductions"] or 0),
            "net_salary": float(u["net_salary"] or 0),
            "leave_balance_paid": u["leave_balance_paid"],
            "leave_balance_sick": u["leave_balance_sick"],
            "is_email_verified": bool(u["is_email_verified"]),
            "created_at": u["created_at"]
        }
    }

@router.patch("/self")
async def update_self_profile(
    payload: EmployeeSelfProfileUpdateSchema,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Prompt 5.2: Role-Based Field Security:
    For users with role = EMPLOYEE, restrict write access to phone, address, and profile_picture_url.
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
        return {"success": True, "message": "No profile update values provided."}

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
    payload: AdminProfileUpdateSchema,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Prompt 5.2: Role-Based Field Security:
    For users with role = HR_ADMIN, enable comprehensive modification rights across all data fields,
    including documents_url, organizational placement, and compensation logic.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, email, salary_base, salary_allowances, salary_deductions FROM users WHERE id = ?", (target_user_id,))
    target = cursor.fetchone()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Target employee record not found."}
        )

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
    if payload.job_title is not None:
        updates.append("job_title = ?")
        params.append(payload.job_title.strip())
    if payload.department is not None:
        updates.append("department = ?")
        params.append(payload.department.strip())
    if payload.documents_url is not None:
        updates.append("documents_url = ?")
        params.append(payload.documents_url.strip())
    if payload.leave_balance_paid is not None:
        updates.append("leave_balance_paid = ?")
        params.append(payload.leave_balance_paid)
    if payload.leave_balance_sick is not None:
        updates.append("leave_balance_sick = ?")
        params.append(payload.leave_balance_sick)

    # Compensation calculation logic
    base = payload.salary_base if payload.salary_base is not None else float(target["salary_base"] or 5000.0)
    allow = payload.salary_allowances if payload.salary_allowances is not None else float(target["salary_allowances"] or 500.0)
    ded = payload.salary_deductions if payload.salary_deductions is not None else float(target["salary_deductions"] or 250.0)
    net = round(base + allow - ded, 2)

    if payload.salary_base is not None or payload.salary_allowances is not None or payload.salary_deductions is not None:
        updates.append("salary_base = ?")
        params.append(base)
        updates.append("salary_allowances = ?")
        params.append(allow)
        updates.append("salary_deductions = ?")
        params.append(ded)
        updates.append("net_salary = ?")
        params.append(net)

        # Update matching payroll table record
        cursor.execute("""
            UPDATE payroll 
            SET salary_base = ?, salary_allowances = ?, salary_deductions = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (base, allow, ded, net, target_user_id))

    if not updates:
        return {"success": True, "message": "No administrative updates provided."}

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(target_user_id)

    cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()

    return {
        "success": True,
        "message": f"Administrative updates applied to employee {target['email']}.",
        "data": {
            "user_id": target_user_id,
            "salary_base": base,
            "net_salary": net
        }
    }
