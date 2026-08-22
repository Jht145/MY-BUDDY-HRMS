import time
import datetime
from starlette.testclient import TestClient
from main import app
from backend.rate_limiter import limiter
from backend.utils.geofence import calculate_haversine_distance

client = TestClient(app)

def assert_true(condition, message):
    if not condition:
        print(f"[FAIL] {message}")
        raise AssertionError(message)
    else:
        print(f"[PASS] {message}")

def run_tests():
    print("\n==========================================================================")
    print("RUNNING COMPLETE DAYFLOW HRMS TEST SUITE (8 PROMPTS & EXACT FIELD DICT)")
    print("==========================================================================\n")

    limiter.reset()

    # PROMPT 1 & 2: AUTHENTICATION ENGINE & REGISTRATION WORKFLOW
    print("--- Testing Prompt 1 & 2: Schema & Auth Engine ---")
    ts = int(time.time() * 1000)
    emp_email = f"emp_dayflow_{ts}@mybuddyhrms.com"
    emp_id = f"EMP-DF-{ts}"
    pwd = "SecurePassword@2026!"

    # 1. Registration (/signup)
    res_reg = client.post("/signup", json={
        "employee_id": emp_id,
        "first_name": "Alexander",
        "last_name": "Wright",
        "email": emp_email,
        "password": pwd,
        "role": "EMPLOYEE"
    })
    assert_true(res_reg.status_code == 201, "Prompt 2: /signup created account successfully")
    reg_data = res_reg.json()["data"]
    assert_true(reg_data["is_email_verified"] is False, "Prompt 2: is_email_verified initialized to false")
    v_token = reg_data["verification_token"]
    user_id = reg_data["user_id"]

    # 2. Login fails before email verification
    limiter.reset()
    res_unver_login = client.post("/login", json={"email": emp_email, "password": pwd})
    assert_true(res_unver_login.status_code == 403, "Prompt 2: Login blocked for unverified email (403 Forbidden)")
    detail = res_unver_login.json().get("detail", res_unver_login.json())
    assert_true(detail.get("is_email_verified") is False, "Prompt 2: Correctly reports unverified email status")

    # 3. Verification API (/verify-email?token=...)
    res_ver = client.get(f"/verify-email?token={v_token}")
    assert_true(res_ver.status_code == 200, "Prompt 2: /verify-email?token=... updates is_email_verified to true")

    # 4. Login succeeds after verification
    res_login = client.post("/login", json={"email": emp_email, "password": pwd})
    assert_true(res_login.status_code == 200, "Prompt 2: /login returns JWT with user_id and role")
    emp_jwt = res_login.json()["token"]
    assert_true(res_login.json()["user"]["role"] == "EMPLOYEE", "JWT user role is EMPLOYEE")

    # Log in as HR Admin
    res_adm = client.post("/login", json={"email": "admin@mybuddyhrms.com", "password": "Admin@12345"})
    admin_jwt = res_adm.json()["token"]

    # PROMPT 4: DASHBOARDS & EMPLOYEE CONTEXT SWITCHER
    print("\n--- Testing Prompt 4: Dashboards & Context Switcher ---")
    limiter.reset()

    # Employee Dashboard (Announcements, metrics)
    res_emp_dash = client.get("/api/employee/dashboard", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_emp_dash.status_code == 200, "Prompt 4.1: Employee Dashboard loaded")
    dash_data = res_emp_dash.json()["data"]
    assert_true("announcements" in dash_data, "Prompt 4.1: Recent announcements included in dashboard")
    assert_true(len(dash_data["announcements"]) > 0, "Prompt 4.1: Announcements feed populated")

    # Admin Context Switcher Tool (Inspect specific employee)
    res_context = client.get(f"/api/admin/employees/{user_id}/context-view", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_context.status_code == 200, "Prompt 4.2: Admin Context Switcher loaded employee view")
    assert_true(res_context.json()["context_user"]["email"] == emp_email, "Prompt 4.2: Switched view context matches selected employee")

    # PROMPT 5: EMPLOYEE PROFILE MANAGEMENT & ROLE-BASED FIELD SECURITY
    print("\n--- Testing Prompt 5: Profile Management & Granular Permissions ---")
    limiter.reset()

    # 1. View Profile Component (Exact fields including documents_url, salary_base, net_salary)
    res_prof = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_prof.status_code == 200, "Prompt 5.1: Profile View Component retrieved")
    p = res_prof.json()["profile"]
    assert_true("documents_url" in p, "Prompt 5.1: documents_url field rendered")
    assert_true("salary_base" in p and "net_salary" in p, "Prompt 5.1: Protected salary keys present")

    # 2. Employee self-update (phone, address, profile_picture_url)
    res_self_upd = client.patch(
        "/api/v1/profile/self",
        json={"phone": "+1 (555) 777-8888", "address": "100 Innovation Way, Bangalore"},
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_self_upd.status_code == 200, "Prompt 5.2: Employee self-service update succeeded")

    # 3. Admin comprehensive modification rights (documents_url, organizational placement, salary)
    res_adm_upd = client.patch(
        f"/api/v1/profile/admin/{user_id}",
        json={
            "job_title": "Principal Architect",
            "department": "Infrastructure",
            "documents_url": "https://mybuddyhrms.com/docs/alex_kyc.pdf",
            "salary_base": 8000.00,
            "salary_allowances": 800.00,
            "salary_deductions": 400.00
        },
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_adm_upd.status_code == 200, "Prompt 5.2: HR Admin modified organizational and compensation fields")
    assert_true(res_adm_upd.json()["data"]["net_salary"] == 8400.00, "Prompt 5.2: net_salary auto-computed to $8,400.00")

    # PROMPT 6: SMART KIOSK ATTENDANCE & MONTHLY INTERACTIVE CALENDAR
    print("\n--- Testing Prompt 6: Smart Kiosk Attendance & Calendar ---")
    limiter.reset()

    # 1. Check-In Within Office Geofence (12.9716, 77.5946)
    res_checkin_in = client.post(
        "/api/v1/attendance/kiosk/check-in",
        json={
            "check_in_photo_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
            "check_in_latitude": 12.9716,
            "check_in_longitude": 77.5946
        },
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_checkin_in.status_code == 200, "Prompt 6.1: Kiosk check-in succeeded")
    c_in = res_checkin_in.json()["data"]
    assert_true(c_in["is_within_geofence"] is True, "Prompt 6.2: is_within_geofence = true within radius")
    assert_true(c_in["approval_status"] == "AUTO_APPROVED", "Prompt 6.2: approval_status = AUTO_APPROVED")
    assert_true(c_in["attendance_status"] == "PRESENT", "Prompt 6.2: attendance_status = PRESENT")

    # 2. Check-Out
    res_checkout = client.post(
        "/api/v1/attendance/kiosk/check-out",
        json={"check_out_photo_url": "https://img.com/checkout.jpg"},
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_checkout.status_code == 200, "Prompt 6.1: Kiosk check-out recorded")

    # 3. Check-In Outside Geofence (Remote)
    res_checkin_out = client.post(
        "/api/v1/attendance/kiosk/check-in",
        json={
            "check_in_photo_url": "https://img.com/remote.jpg",
            "check_in_latitude": 13.0827,
            "check_in_longitude": 80.2707
        },
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_checkin_out.status_code == 200, "Prompt 6.1: Remote kiosk check-in submitted")
    c_out = res_checkin_out.json()["data"]
    assert_true(c_out["is_within_geofence"] is False, "Prompt 6.2: is_within_geofence = false outside radius")
    assert_true(c_out["approval_status"] == "PENDING_ADMIN_APPROVAL", "Prompt 6.2: approval_status = PENDING_ADMIN_APPROVAL")
    flagged_att_id = c_out["attendance_id"]

    # 4. Admin reviews Flagged attendance queue
    limiter.reset()
    res_flagged = client.get("/api/v1/attendance/admin/flagged", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_flagged.status_code == 200, "Prompt 6.2: HR Admin retrieved flagged attendance queue")
    assert_true(any(l["attendance_id"] == flagged_att_id for l in res_flagged.json()["flagged_logs"]), "Flagged record found in admin queue")

    # 5. Admin Approves flagged entry
    res_att_ver = client.patch(
        f"/api/v1/attendance/admin/verify/{flagged_att_id}",
        json={"approval_status": "APPROVED", "admin_comment": "Approved: Valid client on-site assignment"},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_att_ver.status_code == 200, "Prompt 6.2: HR Admin approved flagged attendance")
    assert_true(res_att_ver.json()["data"]["approval_status"] == "APPROVED", "Approval status set to APPROVED")

    # 6. Monthly Interactive Calendar Endpoint
    res_cal = client.get("/api/v1/attendance/calendar", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_cal.status_code == 200, "Prompt 6.3: Monthly calendar grid data returned")
    assert_true("attendance_by_date" in res_cal.json() and "approved_leaves_by_date" in res_cal.json(), "Prompt 6.3: Daily attendance and approved leave mappings present")

    # PROMPT 7: LEAVE & TIME-OFF MANAGEMENT MODULE
    print("\n--- Testing Prompt 7: Leave & Time-Off Management ---")
    limiter.reset()

    # 1. Employee applies for Leave (leave_type: PAID, initial state: leave_status = PENDING)
    res_leave_app = client.post(
        "/api/v1/leaves/apply",
        json={
            "leave_type": "PAID",
            "start_date": "2026-09-14",
            "end_date": "2026-09-16",
            "leave_reason": "Attending regional developer conference"
        },
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_leave_app.status_code == 200, "Prompt 7.1: Leave application submitted")
    leave_data = res_leave_app.json()["data"]
    assert_true(leave_data["leave_status"] == "PENDING", "Prompt 7.1: Initial leave_status is PENDING")
    leave_id = leave_data["leave_id"]

    # 2. Leave Approval Queue (Admin)
    res_l_queue = client.get("/api/v1/leaves/admin/queue", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_l_queue.status_code == 200, "Prompt 7.2: Admin retrieved leave queue")
    assert_true(any(l["leave_id"] == leave_id for l in res_l_queue.json()["pending_queue"]), "Prompt 7.2: Submitted leave in queue")

    # 3. Admin Approves Leave with admin_comment
    res_l_action = client.patch(
        f"/api/v1/leaves/admin/action/{leave_id}",
        json={"leave_status": "APPROVED", "admin_comment": "Approved by Engineering VP"},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_l_action.status_code == 200, "Prompt 7.2: Leave request approved")
    assert_true(res_l_action.json()["data"]["leave_status"] == "APPROVED", "leave_status set to APPROVED")

    # PROMPT 8: PAYROLL & COMPENSATION MANAGEMENT MODULE
    print("\n--- Testing Prompt 8: Payroll & Compensation Management ---")
    limiter.reset()

    # 1. Employee Read-Only Payroll View (salary_base, salary_allowances, salary_deductions, net_salary)
    res_my_pay = client.get("/api/v1/payroll/my-payslips", headers={"Authorization": f"Bearer {emp_jwt}"})
    assert_true(res_my_pay.status_code == 200, "Prompt 8.1: Employee payroll view retrieved")
    pay_rec = res_my_pay.json()["payroll_records"][0]
    assert_true(pay_rec["salary_base"] == 8000.00, "Prompt 8.1: salary_base matches profile")
    assert_true(pay_rec["net_salary"] == 8400.00, "Prompt 8.1: net_salary matches computed amount")

    # 2. Admin Payroll Control (Adjust salary and auto-calculate net_salary)
    res_pay_adj = client.put(
        f"/api/v1/payroll/admin/adjust/{user_id}",
        json={"salary_base": 9000.00, "salary_allowances": 900.00, "salary_deductions": 450.00},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_pay_adj.status_code == 200, "Prompt 8.2: Admin adjusted compensation")
    assert_true(res_pay_adj.json()["data"]["net_salary"] == 9450.00, "Prompt 8.2: net_salary auto-calculated ($9,000 + $900 - $450 = $9,450.00)")

    # Non-admin blocked from payload modification routes
    res_blocked_pay = client.put(
        f"/api/v1/payroll/admin/adjust/{user_id}",
        json={"salary_base": 12000.00, "salary_allowances": 1000.00, "salary_deductions": 0.00},
        headers={"Authorization": f"Bearer {emp_jwt}"}
    )
    assert_true(res_blocked_pay.status_code == 403, "Prompt 8.2: Non-admin users strictly blocked from payload modification routes (403 Forbidden)")

    # 3. Phase 2: Granular 6-Step Backend Calculation Engine with Monthly Wage
    print("\n--- Testing Phase 2: 6-Step Granular Salary Engine ---")
    limiter.reset()
    res_wage_calc = client.put(
        f"/api/v1/payroll/admin/adjust/{user_id}",
        json={"monthly_wage": 50000.00},
        headers={"Authorization": f"Bearer {admin_jwt}"}
    )
    assert_true(res_wage_calc.status_code == 200, "Phase 2: Monthly wage computation executed")
    calc_d = res_wage_calc.json()["data"]
    # Step 1: Basic = 50,000 * 50% = 25,000
    assert_true(calc_d["basic_salary"] == 25000.00, "Step 1: Basic Salary is 50% of Wage ($25,000.00)")
    # Step 2: HRA = 25,000 * 50% = 12,500
    assert_true(calc_d["hra"] == 12500.00, "Step 2: HRA is 50% of Basic ($12,500.00)")
    # Step 3: Percentage-based allowances (Standard 5% = 2,500, Performance 5% = 2,500, LTA 5% = 2,500)
    assert_true(calc_d["standard_allowance"] == 2500.00, "Step 3: Standard Allowance is 5% ($2,500.00)")
    assert_true(calc_d["performance_bonus"] == 2500.00, "Step 3: Performance Bonus is 5% ($2,500.00)")
    assert_true(calc_d["lta"] == 2500.00, "Step 3: LTA is 5% ($2,500.00)")
    # Step 4: Fixed Allowance = 50,000 - (25,000 + 12,500 + 2,500 + 2,500 + 2,500) = 5,000
    assert_true(calc_d["fixed_allowance"] == 5000.00, "Step 4: Fixed Allowance is Wage minus allocated ($5,000.00)")
    # Step 5: Deductions: PF (25,000 * 12% = 3,000) and PT (Fixed 200)
    assert_true(calc_d["pf_employee"] == 3000.00, "Step 5: PF Employee is 12% of Basic ($3,000.00)")
    assert_true(calc_d["professional_tax"] == 200.00, "Step 5: Professional Tax is fixed $200.00")
    # Step 6: Net Salary = 50,000 - (3,000 + 200) = 46,800
    assert_true(calc_d["net_salary"] == 46800.00, "Step 6: Net Salary is Wage minus PF & PT ($46,800.00)")

    print("\n==========================================================================")
    print("ALL 8 TASK PROMPTS AND EXACT DATA FIELD DICTIONARY TESTS PASSED 100%!")
    print("==========================================================================\n")

if __name__ == "__main__":
    run_tests()
