from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
import sqlite3

from backend.db import get_db
from backend.middleware import require_role

# Restrict all routes in this router strictly to HR_ADMIN role
router = APIRouter(
    prefix="/api/admin",
    tags=["HR Administration"],
    dependencies=[Depends(require_role("HR_ADMIN"))]
)

@router.get("/overview")
async def get_admin_overview(
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin Dashboard Summary Metrics.
    Strictly protected: HR_ADMIN role required.
    """
    cursor = db.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM users")
    total_users = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE is_verified = 1")
    verified_users = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE is_verified = 0")
    pending_users = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE locked_until IS NOT NULL")
    locked_users = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'HR_ADMIN'")
    admin_count = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'EMPLOYEE'")
    employee_count = cursor.fetchone()["count"]

    return {
        "success": True,
        "data": {
            "totalUsers": total_users,
            "verifiedUsers": verified_users,
            "pendingUsers": pending_users,
            "lockedUsers": locked_users,
            "rolesBreakdown": {
                "HR_ADMIN": admin_count,
                "EMPLOYEE": employee_count
            },
            "adminUser": {
                "employee_id": admin_user.get("employee_id"),
                "email": admin_user.get("email"),
                "role": admin_user.get("role")
            }
        }
    }

@router.get("/employees")
async def get_all_employees(
    search: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Employee Directory with live search & role filtering.
    Admin can see ALL employees data.
    """
    cursor = db.cursor()
    query = """
        SELECT id, employee_id, first_name, last_name, email, role, is_verified, verification_token, failed_login_attempts, locked_until, created_at, updated_at
        FROM users
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term, term, term])

    if role and role in ['HR_ADMIN', 'EMPLOYEE']:
        query += " AND role = ?"
        params.append(role)

    query += " ORDER BY created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()

    employees = []
    for r in rows:
        employees.append({
            "id": r["id"],
            "employee_id": r["employee_id"],
            "first_name": r["first_name"],
            "last_name": r["last_name"],
            "email": r["email"],
            "role": r["role"],
            "is_verified": bool(r["is_verified"]),
            "is_locked": bool(r["locked_until"]),
            "failed_attempts": r["failed_login_attempts"],
            "verification_token": r["verification_token"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"]
        })

    return {
        "success": True,
        "count": len(employees),
        "employees": employees
    }

@router.patch("/employees/{user_id}/verify")
async def toggle_employee_verification(
    user_id: int,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Manually toggle employee verification status by HR Admin.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, email, is_verified FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Employee record not found."}
        )

    new_status = 0 if user["is_verified"] else 1
    cursor.execute("""
        UPDATE users 
        SET is_verified = ?, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    """, (new_status, user_id))
    db.commit()

    return {
        "success": True,
        "message": f"Employee ({user['email']}) verification set to {'VERIFIED' if new_status else 'UNVERIFIED'}.",
        "is_verified": bool(new_status)
    }

@router.patch("/employees/{user_id}/unlock")
async def unlock_employee_account(
    user_id: int,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin action: Unlock an employee account that was locked after 3 failed login attempts.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, email, locked_until FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Employee record not found."}
        )

    cursor.execute("""
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    """, (user_id,))
    db.commit()

    return {
        "success": True,
        "message": f"Account for {user['email']} has been unlocked and failed login trials reset."
    }
