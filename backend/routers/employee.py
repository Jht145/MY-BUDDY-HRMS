from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3

from backend.db import get_db
from backend.middleware import get_current_user

router = APIRouter(
    prefix="/api/employee",
    tags=["Employee Portal"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/dashboard")
async def get_employee_dashboard(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Returns strictly user-scoped dashboard data for the authenticated employee.
    """
    user_id = current_user.get("user_id")
    cursor = db.cursor()

    cursor.execute("""
        SELECT id, employee_id, first_name, last_name, email, role, is_verified, created_at
        FROM users
        WHERE id = ?
    """, (user_id,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Employee record not found."}
        )

    # Scoped employee mock metrics
    return {
        "success": True,
        "message": "Employee dashboard loaded securely.",
        "data": {
            "profile": {
                "id": user["id"],
                "employee_id": user["employee_id"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"],
                "role": user["role"],
                "is_verified": bool(user["is_verified"]),
                "created_at": user["created_at"]
            },
            "leaveBalance": {
                "annual": 14,
                "sick": 7,
                "casual": 3,
                "used": 4
            },
            "attendanceSummary": {
                "presentDays": 21,
                "totalWorkingDays": 22,
                "checkInTime": "09:05 AM",
                "status": "Active (On Duty)"
            },
            "recentPayslip": {
                "month": "August 2026",
                "netPay": "$4,850.00",
                "status": "Processed"
            },
            "securityContext": {
                "role": current_user.get("role"),
                "scope": "USER_RESTRICTED",
                "adminAccessGranted": False
            }
        }
    }
