import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.db import get_db
from backend.middleware import get_current_user, require_role
from backend.schemas import AdminAdjustPayrollSchema

router = APIRouter(
    prefix="/api/v1/payroll",
    tags=["Payroll & Compensation Management (Prompt 8)"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/my-payslips")
async def get_my_payroll_breakdown(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Prompt 8.1: Employee Payroll View:
    Provide a read-only salary breakdown displaying salary_base, salary_allowances,
    salary_deductions, and calculated net_salary.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT p.payroll_id, p.user_id, p.salary_base, p.salary_allowances, p.salary_deductions,
               p.net_salary, p.updated_at,
               u.employee_id, u.first_name, u.last_name, u.department, u.job_title
        FROM payroll p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.payroll_id DESC
    """, (current_user["user_id"],))
    rows = cursor.fetchall()

    records = [
        {
            "payroll_id": r["payroll_id"],
            "user_id": r["user_id"],
            "employee_id": r["employee_id"],
            "employee_name": f"{r['first_name']} {r['last_name']}",
            "job_title": r["job_title"],
            "department": r["department"],
            "salary_base": float(r["salary_base"]),
            "salary_allowances": float(r["salary_allowances"]),
            "salary_deductions": float(r["salary_deductions"]),
            "net_salary": float(r["net_salary"]),
            "updated_at": r["updated_at"]
        }
        for r in rows
    ]

    return {"success": True, "count": len(records), "payroll_records": records}

@router.get("/admin/overview")
async def get_admin_payroll_overview(
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Prompt 8.2: Admin Payroll Control Workspace:
    List all employees with real-time computed salary components and net_salary.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT u.id as user_id, u.employee_id, u.first_name, u.last_name, u.department, u.job_title,
               u.salary_base, u.salary_allowances, u.salary_deductions, u.net_salary,
               (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND a.attendance_status = 'PRESENT') as present_days,
               (SELECT COUNT(*) FROM leave_requests l WHERE l.user_id = u.id AND l.leave_status = 'APPROVED' AND l.leave_type = 'UNPAID') as unpaid_leave_days
        FROM users u
        ORDER BY u.id ASC
    """)
    users = cursor.fetchall()

    payroll_sheet = []
    total_cost = 0.0

    for u in users:
        base = float(u["salary_base"] or 5000.00)
        allowances = float(u["salary_allowances"] or round(base * 0.10, 2))
        deductions = float(u["salary_deductions"] or round(base * 0.05, 2))
        net = round(base + allowances - deductions, 2)
        total_cost += net

        payroll_sheet.append({
            "user_id": u["user_id"],
            "employee_id": u["employee_id"],
            "employee_name": f"{u['first_name']} {u['last_name']}",
            "department": u["department"],
            "job_title": u["job_title"],
            "salary_base": base,
            "salary_allowances": allowances,
            "salary_deductions": deductions,
            "net_salary": net,
            "present_days": u["present_days"],
            "unpaid_leave_days": u["unpaid_leave_days"]
        })

    return {
        "success": True,
        "total_staff": len(payroll_sheet),
        "total_payroll_cost": total_cost,
        "payroll_sheet": payroll_sheet
    }

@router.put("/admin/adjust/{target_user_id}")
async def adjust_employee_payroll(
    target_user_id: int,
    payload: AdminAdjustPayrollSchema,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Prompt 8.2: Admin Payroll Control:
    Build an admin editor interface where HR Officers can select any employee, adjust
    salary_base, salary_allowances, and salary_deductions, auto-calculate net_salary,
    and save changes directly to the backend database.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, email FROM users WHERE id = ?", (target_user_id,))
    target = cursor.fetchone()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Target employee record not found."}
        )

    # Auto-calculate net_salary
    net_salary = round(payload.salary_base + payload.salary_allowances - payload.salary_deductions, 2)

    # Update users table
    cursor.execute("""
        UPDATE users 
        SET salary_base = ?, salary_allowances = ?, salary_deductions = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (payload.salary_base, payload.salary_allowances, payload.salary_deductions, net_salary, target_user_id))

    # Update or insert payroll table
    cursor.execute("SELECT payroll_id FROM payroll WHERE user_id = ?", (target_user_id,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE payroll 
            SET salary_base = ?, salary_allowances = ?, salary_deductions = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (payload.salary_base, payload.salary_allowances, payload.salary_deductions, net_salary, target_user_id))
    else:
        cursor.execute("""
            INSERT INTO payroll (user_id, salary_base, salary_allowances, salary_deductions, net_salary)
            VALUES (?, ?, ?, ?, ?)
        """, (target_user_id, payload.salary_base, payload.salary_allowances, payload.salary_deductions, net_salary))

    db.commit()

    return {
        "success": True,
        "message": f"Compensation structure adjusted for employee {target['email']}. Net salary auto-calculated to ${net_salary:.2f}.",
        "data": {
            "user_id": target_user_id,
            "salary_base": payload.salary_base,
            "salary_allowances": payload.salary_allowances,
            "salary_deductions": payload.salary_deductions,
            "net_salary": net_salary
        }
    }
