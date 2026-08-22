from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Literal
import datetime
import sqlite3

from backend.db import get_db
from backend.middleware import get_current_user, require_role

router = APIRouter(
    prefix="/api/v1/leaves",
    tags=["Leave Management"],
    dependencies=[Depends(get_current_user)]
)

class LeaveApplyRequest(BaseModel):
    type: Literal["PAID", "SICK", "UNPAID"] = Field(..., description="Leave category")
    start_date: str = Field(..., description="Start Date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End Date (YYYY-MM-DD)")
    reason: str = Field(..., min_length=3, description="Reason for time-off")

class LeaveAdminActionRequest(BaseModel):
    action: Literal["APPROVE", "REJECT"] = Field(..., description="Approval decision")
    admin_comments: Optional[str] = Field(default=None, description="Comments / notes")

def calculate_working_days(start_str: str, end_str: str) -> int:
    """Calculates working days excluding Saturdays and Sundays."""
    try:
        start = datetime.date.fromisoformat(start_str)
        end = datetime.date.fromisoformat(end_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Invalid date format. Expected YYYY-MM-DD."}
        )

    if end < start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "End date cannot be prior to start date."}
        )

    days = 0
    curr = start
    while curr <= end:
        if curr.weekday() < 5:  # Monday = 0, Friday = 4
            days += 1
        curr += datetime.timedelta(days=1)

    return max(1, days)

@router.post("/apply")
async def apply_for_leave(
    payload: LeaveApplyRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Employee request submission for PAID, SICK, or UNPAID leave.
    Validates date range and calculates net working days.
    """
    user_id = current_user["user_id"]
    days_count = calculate_working_days(payload.start_date, payload.end_date)

    cursor = db.cursor()
    cursor.execute("SELECT leave_balance_paid, leave_balance_sick FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    # Balance validation for paid / sick leave
    if payload.type == "PAID" and (user["leave_balance_paid"] or 0) < days_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": f"Insufficient Paid Leave balance. You have {user['leave_balance_paid']} days available, requested {days_count}."
            }
        )
    elif payload.type == "SICK" and (user["leave_balance_sick"] or 0) < days_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": f"Insufficient Sick Leave balance. You have {user['leave_balance_sick']} days available, requested {days_count}."
            }
        )

    cursor.execute("""
        INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, reason, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    """, (user_id, payload.type, payload.start_date, payload.end_date, days_count, payload.reason.strip()))
    db.commit()
    leave_id = cursor.lastrowid

    return {
        "success": True,
        "message": f"Leave request for {days_count} day(s) submitted and routed to HR approval queue.",
        "data": {
            "leave_id": leave_id,
            "type": payload.type,
            "days_count": days_count,
            "status": "PENDING"
        }
    }

@router.get("/my-requests")
async def get_my_leave_requests(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Fetch all personal leave applications submitted by the logged-in employee.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, type, start_date, end_date, days_count, reason, status, admin_comments, created_at
        FROM leave_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (current_user["user_id"],))
    rows = cursor.fetchall()

    requests = [
        {
            "id": r["id"],
            "type": r["type"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "days_count": r["days_count"],
            "reason": r["reason"],
            "status": r["status"],
            "admin_comments": r["admin_comments"],
            "created_at": r["created_at"]
        }
        for r in rows
    ]

    return {"success": True, "count": len(requests), "leave_requests": requests}

@router.get("/admin/queue")
async def get_admin_leave_queue(
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin inbox for all pending leave approvals.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT l.id, l.user_id, u.employee_id, u.first_name, u.last_name, u.email, u.department,
               u.leave_balance_paid, u.leave_balance_sick,
               l.type, l.start_date, l.end_date, l.days_count, l.reason, l.status, l.created_at
        FROM leave_requests l
        JOIN users u ON l.user_id = u.id
        WHERE l.status = 'PENDING'
        ORDER BY l.created_at ASC
    """)
    rows = cursor.fetchall()

    queue = [
        {
            "id": r["id"],
            "user_id": r["user_id"],
            "employee_id": r["employee_id"],
            "employee_name": f"{r['first_name']} {r['last_name']}",
            "email": r["email"],
            "department": r["department"],
            "paid_balance": r["leave_balance_paid"],
            "sick_balance": r["leave_balance_sick"],
            "type": r["type"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "days_count": r["days_count"],
            "reason": r["reason"],
            "status": r["status"],
            "submitted_at": r["created_at"]
        }
        for r in rows
    ]

    return {"success": True, "count": len(queue), "pending_queue": queue}

@router.patch("/admin/action/{leave_id}")
async def action_leave_request(
    leave_id: int,
    payload: LeaveAdminActionRequest,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Approve or reject a leave application.
    If APPROVED: Automatically deducts leave days from user's leave balance.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT l.id, l.user_id, l.type, l.days_count, l.status, u.leave_balance_paid, u.leave_balance_sick 
        FROM leave_requests l
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ?
    """, (leave_id,))
    leave = cursor.fetchone()

    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Leave request not found."}
        )

    new_status = "APPROVED" if payload.action == "APPROVE" else "REJECTED"

    # Automated leave balance deduction upon approval
    if payload.action == "APPROVE" and leave["status"] != "APPROVED":
        if leave["type"] == "PAID":
            new_bal = max(0, leave["leave_balance_paid"] - leave["days_count"])
            cursor.execute("UPDATE users SET leave_balance_paid = ? WHERE id = ?", (new_bal, leave["user_id"]))
        elif leave["type"] == "SICK":
            new_bal = max(0, leave["leave_balance_sick"] - leave["days_count"])
            cursor.execute("UPDATE users SET leave_balance_sick = ? WHERE id = ?", (new_bal, leave["user_id"]))

    cursor.execute("""
        UPDATE leave_requests
        SET status = ?, admin_comments = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, payload.admin_comments, leave_id))
    db.commit()

    return {
        "success": True,
        "message": f"Leave request #{leave_id} has been {new_status}.",
        "new_status": new_status,
        "admin_comments": payload.admin_comments
    }
