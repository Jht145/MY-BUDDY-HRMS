from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Literal
import sqlite3

from backend.db import get_db
from backend.middleware import get_current_user, require_role

router = APIRouter(
    prefix="/api/v1/payroll",
    tags=["Payroll Management"],
    dependencies=[Depends(get_current_user)]
)

class PayrollAdjustmentRequest(BaseModel):
    base_salary: float = Field(..., ge=0, description="Base Monthly Salary")
    allowances: float = Field(default=0.0, ge=0, description="Housing, Travel & Performance Allowances")
    deductions: float = Field(default=0.0, ge=0, description="Tax, Health & Statutory Deductions")

class PayrollFinalizeRequest(BaseModel):
    pay_period: str = Field(..., description="Pay period identifier (e.g. 2026-08)")

@router.get("/my-payslips")
async def get_my_payslips(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Employee Portal: Itemized payslip records for the logged-in user.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT p.id, p.pay_period, p.base_salary, p.allowances, p.deductions, p.net_pay, p.status, p.created_at,
               u.employee_id, u.first_name, u.last_name, u.department, u.job_title
        FROM payroll_records p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.pay_period DESC
    """, (current_user["user_id"],))
    rows = cursor.fetchall()

    payslips = [
        {
            "id": r["id"],
            "pay_period": r["pay_period"],
            "base_salary": float(r["base_salary"]),
            "allowances": float(r["allowances"]),
            "deductions": float(r["deductions"]),
            "net_pay": float(r["net_pay"]),
            "status": r["status"],
            "employee_id": r["employee_id"],
            "employee_name": f"{r['first_name']} {r['last_name']}",
            "department": r["department"],
            "job_title": r["job_title"],
            "generated_date": r["created_at"]
        }
        for r in rows
    ]

    return {"success": True, "count": len(payslips), "payslips": payslips}

@router.get("/admin/overview")
async def get_admin_payroll_overview(
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin Workspace: Master payroll overview across all employees with automated net calculations.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT u.id as user_id, u.employee_id, u.first_name, u.last_name, u.department, u.job_title,
               u.base_salary,
               (SELECT COUNT(*) FROM attendance_logs a WHERE a.user_id = u.id AND a.status = 'PRESENT') as present_days,
               (SELECT COUNT(*) FROM leave_requests l WHERE l.user_id = u.id AND l.status = 'APPROVED' AND l.type = 'UNPAID') as unpaid_leave_days
        FROM users u
        ORDER BY u.id ASC
    """)
    users = cursor.fetchall()

    payroll_sheet = []
    total_payroll_cost = 0.0

    for u in users:
        base = float(u["base_salary"] or 5000.00)
        allowances = round(base * 0.10, 2)  # Standard 10% statutory benefit
        # Calculate unpaid leave deductions (assume 22 working days / month)
        daily_rate = base / 22.0
        leave_deductions = round(float(u["unpaid_leave_days"]) * daily_rate, 2)
        tax_deductions = round(base * 0.05, 2)
        total_deductions = round(leave_deductions + tax_deductions, 2)
        net_pay = round(base + allowances - total_deductions, 2)

        total_payroll_cost += net_pay

        payroll_sheet.append({
            "user_id": u["user_id"],
            "employee_id": u["employee_id"],
            "employee_name": f"{u['first_name']} {u['last_name']}",
            "department": u["department"],
            "job_title": u["job_title"],
            "base_salary": base,
            "allowances": allowances,
            "deductions": total_deductions,
            "net_pay": net_pay,
            "present_days": u["present_days"],
            "unpaid_leave_days": u["unpaid_leave_days"]
        })

    return {
        "success": True,
        "total_workforce": len(payroll_sheet),
        "total_payroll_cost": total_payroll_cost,
        "payroll_sheet": payroll_sheet
    }

@router.put("/admin/adjust/{target_user_id}")
async def adjust_employee_payroll(
    target_user_id: int,
    payload: PayrollAdjustmentRequest,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    HR Admin endpoint to adjust an employee's salary and compensation structure.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, email FROM users WHERE id = ?", (target_user_id,))
    target = cursor.fetchone()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Employee not found."}
        )

    net_pay = round(payload.base_salary + payload.allowances - payload.deductions, 2)

    # Update base salary on user master
    cursor.execute("UPDATE users SET base_salary = ? WHERE id = ?", (payload.base_salary, target_user_id))

    # Update or insert active payroll record
    cursor.execute("""
        INSERT INTO payroll_records (user_id, pay_period, base_salary, allowances, deductions, net_pay, status)
        VALUES (?, '2026-08', ?, ?, ?, ?, 'FINALIZED')
    """, (target_user_id, payload.base_salary, payload.allowances, payload.deductions, net_pay))
    db.commit()

    return {
        "success": True,
        "message": f"Compensation adjusted for employee {target['email']}. Net pay recomputed to ${net_pay:.2f}.",
        "data": {
            "user_id": target_user_id,
            "base_salary": payload.base_salary,
            "allowances": payload.allowances,
            "deductions": payload.deductions,
            "net_pay": net_pay
        }
    }

@router.post("/admin/finalize")
async def finalize_monthly_payroll(
    payload: PayrollFinalizeRequest,
    admin_user: dict = Depends(require_role("HR_ADMIN")),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Commit and lock monthly payroll batch for all employees.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, base_salary FROM users")
    users = cursor.fetchall()

    for u in users:
        base = float(u["base_salary"] or 5000.00)
        allowances = round(base * 0.10, 2)
        deductions = round(base * 0.05, 2)
        net_pay = round(base + allowances - deductions, 2)

        cursor.execute("""
            INSERT INTO payroll_records (user_id, pay_period, base_salary, allowances, deductions, net_pay, status)
            VALUES (?, ?, ?, ?, ?, ?, 'FINALIZED')
        """, (u["id"], payload.pay_period, base, allowances, deductions, net_pay))

    db.commit()

    return {
        "success": True,
        "message": f"Payroll cycle for period {payload.pay_period} locked and committed for {len(users)} staff members.",
        "pay_period": payload.pay_period
    }
