import time
import datetime
from starlette.testclient import TestClient
from main import app
from backend.rate_limiter import limiter
from backend.db import get_db_connection
from backend.utils.geofence import calculate_haversine_distance, evaluate_geofence

client = TestClient(app)

def assert_true(condition, message):
    if not condition:
        print(f"[FAIL] {message}")
        raise AssertionError(message)
    else:
        print(f"[PASS] {message}")

def run_tests():
    print("\n=================================================================")
    print("RUNNING COMPLETE MY BUDDY HRMS FULL SYSTEM AUDIT (README SPEC)")
    print("=================================================================\n")

    limiter.reset()

    # 1. Health & Modules Check
    res = client.get("/api/v1/health")
    assert_true(res.status_code == 200, "System Health Check returns 200 OK")
    assert_true(len(res.json()["modules"]) == 5, "All 5 core HR modules active")

    # =================================================================
    # MODULE 1: AUTHENTICATION & SECURITY
    # =================================================================
    print("\n--- Testing Module 1: Authentication & Security ---")
    ts = int(time.time() * 1000)
    emp_email = f"kiosk_emp_{ts}@mybuddyhrms.com"
    emp_id = f"EMP-K1-{ts}"
    strong_pwd = "SecureKioskPass@2026!"

    # Registration
    res_reg = client.post("/signup", json={
        "employee_id": emp_id,
        "first_name": "David",
        "last_name": "Miller",
        "email": emp_email,
        "password": strong_pwd,
        "role": "EMPLOYEE"
    })
    assert_true(res_reg.status_code == 201, "Employee registration succeeded")
    v_token = res_reg.json()["data"]["verification_token"]
    user_id = res_reg.json()["data"]["user_id"]

    # Verify Email
    res_ver = client.post("/api/auth/verify-email", json={"token": v_token})
    assert_true(res_ver.status_code == 200, "Employee email verification activated")

    # Log in as Employee
    limiter.reset()
    res_login = client.post("/login", json={"email": emp_email, "password": strong_pwd})
    assert_true(res_login.status_code == 200, "Employee login returns valid session JWT")
    emp_jwt = res_login.json()["token"]

    # Log in as HR Admin
    res_adm_login = client.post("/login", json={"email": "admin@mybuddyhrms.com", "password": "Admin@12345"})
    admin_jwt = res_adm_login.json()["token"]

    # =================================================================
    # MODULE 2: PROFILE MANAGEMENT
    # =================================================================
    print("\n--- Testing Module 2: Profile Management ---")
    limiter.reset()

    # Employee Self-Update (Phone & Address)
    res_prof_self = client.patch(
        "/api/v1/profile/self",
        json={"phone": "+1 (555) 999-0000", "address": "77 Tech Park Blvd, Bangalore"},
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_prof_self.status_code == 200, "Employee self-service profile update succeeded")

    # Verify updated profile
    res_my_prof = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_my_prof.status_code == 200, "Profile retrieved successfully")
    assert_true(res_my_prof.json()["profile"]["phone"] == "+1 (555) 999-0000", "Self-updated phone stored correctly")

    # Admin Update on Employee (Job Title, Department, Salary)
    res_prof_adm = client.patch(
        f"/api/v1/profile/admin/{user_id}",
        json={"job_title": "Lead Architect", "department": "Platform Core", "base_salary": 7500.00},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_prof_adm.status_code == 200, "HR Admin organizational data update succeeded")

    # =================================================================
    # MODULE 3: SMART KIOSK ATTENDANCE & HAVERSINE GEOFENCING
    # =================================================================
    print("\n--- Testing Module 3: Smart Kiosk Attendance & Geofencing ---")
    limiter.reset()

    # Haversine calculation test
    dist_office = calculate_haversine_distance(12.9716, 77.5946)
    assert_true(dist_office < 1.0, f"Haversine calculation at office coordinates is {dist_office}m (< 1m)")

    dist_chennai = calculate_haversine_distance(13.0827, 80.2707)
    assert_true(dist_chennai > 200000.0, f"Haversine distance to Chennai is {dist_chennai:.1f}m (> 200km)")

    # 1. Kiosk Check-In: WITHIN GEOFENCE (Office: 12.9716, 77.5946) -> status: PRESENT
    res_checkin_in = client.post(
        "/api/v1/attendance/kiosk/check-in",
        json={
            "photo_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
            "latitude": 12.9716,
            "longitude": 77.5946
        },
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_checkin_in.status_code == 200, "Kiosk check-in succeeded")
    assert_true(res_checkin_in.json()["data"]["status"] == "PRESENT", "In-geofence check-in auto-approved as PRESENT")

    # 2. Kiosk Check-Out
    res_checkout = client.post(
        "/api/v1/attendance/kiosk/check-out",
        json={"photo_url": "data:image/jpeg;base64,/checkout_snapshot..."},
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_checkout.status_code == 200, "Kiosk check-out recorded successfully")

    # 3. Kiosk Check-In: OUTSIDE GEOFENCE (Remote Coordinates) -> status: PENDING_ADMIN_APPROVAL
    res_checkin_out = client.post(
        "/api/v1/attendance/kiosk/check-in",
        json={
            "photo_url": "data:image/jpeg;base64,/remote_snapshot...",
            "latitude": 13.0827,
            "longitude": 80.2707
        },
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_checkin_out.status_code == 200, "Remote kiosk check-in submitted")
    assert_true(res_checkin_out.json()["data"]["status"] == "PENDING_ADMIN_APPROVAL", "Out-of-geofence check-in flagged for HR Admin review")
    flagged_log_id = res_checkin_out.json()["data"]["log_id"]

    # 4. Admin Verification Desk: Review Flagged Logs
    limiter.reset()
    res_flagged_list = client.get("/api/v1/attendance/admin/flagged", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_flagged_list.status_code == 200, "HR Admin can view flagged attendance queue")
    assert_true(any(l["id"] == flagged_log_id for l in res_flagged_list.json()["flagged_logs"]), "Flagged entry present in HR Admin queue")

    # 5. Admin Approves Flagged Log
    res_verify_action = client.patch(
        f"/api/v1/attendance/admin/verify/{flagged_log_id}",
        json={"action": "APPROVE", "notes": "Approved: Valid client on-site visit"},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_verify_action.status_code == 200, "HR Admin successfully approved flagged attendance log")
    assert_true(res_verify_action.json()["new_status"] == "PRESENT", "Attendance log updated to PRESENT")

    # =================================================================
    # MODULE 4: LEAVE & TIME-OFF MANAGEMENT
    # =================================================================
    print("\n--- Testing Module 4: Leave & Time-Off Management ---")
    limiter.reset()

    # Employee submits 3 days PAID leave request
    res_apply_leave = client.post(
        "/api/v1/leaves/apply",
        json={
            "type": "PAID",
            "start_date": "2026-09-07",
            "end_date": "2026-09-09",
            "reason": "Personal medical appointment and recovery"
        },
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_apply_leave.status_code == 200, "Leave request submitted (200 OK)")
    leave_id = res_apply_leave.json()["data"]["leave_id"]
    assert_true(res_apply_leave.json()["data"]["days_count"] == 3, "Net working days correctly calculated as 3")

    # Admin views Leave Queue
    res_leave_queue = client.get("/api/v1/leaves/admin/queue", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_leave_queue.status_code == 200, "HR Admin retrieved pending leave queue")
    assert_true(any(l["id"] == leave_id for l in res_leave_queue.json()["pending_queue"]), "Submitted leave present in queue")

    # Admin Approves Leave -> Checks balance auto-deduction
    initial_paid_bal = res_my_prof.json()["profile"]["leave_balance_paid"]
    res_action_leave = client.patch(
        f"/api/v1/leaves/admin/action/{leave_id}",
        json={"action": "APPROVE", "admin_comments": "Approved by HR Director"},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_action_leave.status_code == 200, "Leave request approved by HR Admin")

    # Check updated balance
    res_prof_after_leave = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {emp_jwt}"})
    new_paid_bal = res_prof_after_leave.json()["profile"]["leave_balance_paid"]
    assert_true(new_paid_bal == initial_paid_bal - 3, f"Paid leave balance automatically deducted ({initial_paid_bal} -> {new_paid_bal})")

    # =================================================================
    # MODULE 5: PAYROLL MANAGEMENT ENGINE
    # =================================================================
    print("\n--- Testing Module 5: Payroll Management Engine ---")
    limiter.reset()

    # Admin views company payroll overview
    res_pay_overview = client.get("/api/v1/payroll/admin/overview", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_pay_overview.status_code == 200, "HR Admin payroll overview loaded")
    assert_true(res_pay_overview.json()["total_payroll_cost"] > 0, "Payroll auto-computations calculated correctly")

    # Admin adjusts employee compensation
    res_pay_adjust = client.put(
        f"/api/v1/payroll/admin/adjust/{user_id}",
        json={"base_salary": 7500.00, "allowances": 750.00, "deductions": 375.00},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_pay_adjust.status_code == 200, "Payroll adjustment applied")
    assert_true(res_pay_adjust.json()["data"]["net_pay"] == 7875.00, "Net pay correctly computed to $7,875.00")

    # Employee views personal itemized payslips
    res_my_payslips = client.get("/api/v1/payroll/my-payslips", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_my_payslips.status_code == 200, "Employee retrieved personal itemized payslips")
    assert_true(len(res_my_payslips.json()["payslips"]) >= 1, "Itemized payslip record accessible")

    # =================================================================
    # MODULE 6: ROLE-BASED ACCESS CONTROL (RBAC) ISOLATION
    # =================================================================
    print("\n--- Testing Module 6: RBAC Isolation & Security Boundaries ---")
    limiter.reset()

    # Employee trying to access Admin Flagged Attendance -> 403 Forbidden
    res_forbid_att = client.get("/api/v1/attendance/admin/flagged", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_forbid_att.status_code == 403, "Employee blocked from admin attendance desk (403 Forbidden)")

    # Employee trying to access Admin Leave Queue -> 403 Forbidden
    res_forbid_lvs = client.get("/api/v1/leaves/admin/queue", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_forbid_lvs.status_code == 403, "Employee blocked from admin leave queue (403 Forbidden)")

    # Employee trying to access Admin Payroll Overview -> 403 Forbidden
    res_forbid_pay = client.get("/api/v1/payroll/admin/overview", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_forbid_pay.status_code == 403, "Employee blocked from admin payroll overview (403 Forbidden)")

    print("\n=================================================================")
    print("ALL 6 MODULES FROM README.MD SPECIFICATION PASSED 100%!")
    print("=================================================================\n")

if __name__ == "__main__":
    run_tests()
