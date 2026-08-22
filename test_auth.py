import time
import datetime
from starlette.testclient import TestClient
from main import app
from backend.rate_limiter import limiter
from backend.db import get_db_connection

client = TestClient(app)

def assert_true(condition, message):
    if not condition:
        print(f"[FAIL] {message}")
        raise AssertionError(message)
    else:
        print(f"[PASS] {message}")

def run_tests():
    print("\n=========================================================")
    print("RUNNING ADVANCED SECURITY & RBAC PYTHON TEST SUITE")
    print("=========================================================\n")

    # Reset rate limits before beginning baseline tests
    limiter.reset()

    # 1. Health Check
    res = client.get("/api/health")
    assert_true(res.status_code == 200, "Health check returns 200 OK")

    # 2. Registration with strong password & duplicate check
    timestamp = int(time.time() * 1000)
    emp1_id = f"EMP-SEC1-{timestamp}"
    emp1_email = f"sec_emp1_{timestamp}@mybuddyhrms.com"
    emp2_id = f"EMP-SEC2-{timestamp}"
    emp2_email = f"sec_emp2_{timestamp}@mybuddyhrms.com"
    strong_pass = "SecurePass@2026!"

    # Register Employee 1
    res1 = client.post("/signup", json={
        "employee_id": emp1_id,
        "first_name": "Alice",
        "last_name": "Smith",
        "email": emp1_email,
        "password": strong_pass,
        "role": "EMPLOYEE"
    })
    assert_true(res1.status_code == 201, "Employee 1 registered (201 Created)")
    token1 = res1.json()["data"]["verification_token"]
    user1_id = res1.json()["data"]["user_id"]

    # Verify Employee 1 Email
    res_v1 = client.post("/api/auth/verify-email", json={"token": token1})
    assert_true(res_v1.status_code == 200, "Employee 1 email verified")

    # Register Employee 2
    res2 = client.post("/signup", json={
        "employee_id": emp2_id,
        "first_name": "Bob",
        "last_name": "Jones",
        "email": emp2_email,
        "password": strong_pass,
        "role": "EMPLOYEE"
    })
    assert_true(res2.status_code == 201, "Employee 2 registered (201 Created)")
    token2 = res2.json()["data"]["verification_token"]
    user2_id = res2.json()["data"]["user_id"]

    # Verify Employee 2 Email
    client.post("/api/auth/verify-email", json={"token": token2})

    # =========================================================
    # 3. 3-FAILED TRIALS ACCOUNT LOCKOUT TEST
    # =========================================================
    print("\n--- Testing 3-Trials Account Lockout Policy ---")
    limiter.reset()

    # Attempt 1: Wrong Password
    res_fail1 = client.post("/login", json={"email": emp1_email, "password": "WrongPassword1!"})
    assert_true(res_fail1.status_code == 401, "Attempt 1 failed with 401 Unauthorized")
    assert_true(res_fail1.json().get("trials_remaining") == 2, "Response indicates 2 trials remaining")

    # Attempt 2: Wrong Password
    res_fail2 = client.post("/login", json={"email": emp1_email, "password": "WrongPassword2!"})
    assert_true(res_fail2.status_code == 401, "Attempt 2 failed with 401 Unauthorized")
    assert_true(res_fail2.json().get("trials_remaining") == 1, "Response indicates 1 trial remaining")

    # Attempt 3: Wrong Password -> LOCKOUT TRIGGERED
    res_fail3 = client.post("/login", json={"email": emp1_email, "password": "WrongPassword3!"})
    assert_true(res_fail3.status_code == 423, "Attempt 3 triggers 423 Locked status")
    assert_true(res_fail3.json().get("account_locked") is True, "Account is flagged as locked")

    # Attempt 4: Even with correct password, login is blocked while locked
    res_lock_check = client.post("/login", json={"email": emp1_email, "password": strong_pass})
    assert_true(res_lock_check.status_code == 423, "Locked account rejected even with correct password (423 Locked)")

    # HR Admin unlocks Employee 1 account
    conn = get_db_connection()
    conn.execute("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", (user1_id,))
    conn.commit()
    conn.close()

    # Reset rate limit before user logins for RBAC testing
    limiter.reset()

    # Successful login after unlock
    res_login1 = client.post("/login", json={"email": emp1_email, "password": strong_pass})
    assert_true(res_login1.status_code == 200, "Employee 1 logs in successfully after unlock (200 OK)")
    emp1_jwt = res_login1.json()["token"]

    # Login Employee 2
    res_login2 = client.post("/login", json={"email": emp2_email, "password": strong_pass})
    emp2_jwt = res_login2.json()["token"]

    # Login HR Admin
    res_admin_login = client.post("/login", json={"email": "admin@mybuddyhrms.com", "password": "Admin@12345"})
    admin_jwt = res_admin_login.json()["token"]

    # =========================================================
    # 4. STRICT ROLE-BASED DATA SCOPING TEST
    # =========================================================
    print("\n--- Testing Strict Role-Based Data Scoping ---")
    limiter.reset()

    # HR Admin querying ALL employees
    res_admin_all = client.get("/api/admin/employees", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_admin_all.status_code == 200, "HR Admin can view ALL employees directory (200 OK)")
    assert_true(len(res_admin_all.json()["employees"]) >= 3, "Admin receives list of all employees in company")

    # Employee 1 attempting to query /api/admin/employees -> 403 Forbidden
    res_emp_admin = client.get("/api/admin/employees", headers={"Authorization": f"Bearer {emp1_jwt}"})
    assert_true(res_emp_admin.status_code == 403, "Employee blocked from admin directory (403 Forbidden)")

    # Employee 1 querying their OWN record (/api/users/{user1_id}) -> 200 OK
    res_self = client.get(f"/api/users/{user1_id}", headers={"Authorization": f"Bearer {emp1_jwt}"})
    assert_true(res_self.status_code == 200, "Employee 1 can view their OWN user-scoped record (200 OK)")
    assert_true(res_self.json()["user"]["email"] == emp1_email, "Returned data matches Employee 1 identity")

    # Employee 1 attempting to view Employee 2's record (/api/users/{user2_id}) -> 403 Forbidden
    res_other = client.get(f"/api/users/{user2_id}", headers={"Authorization": f"Bearer {emp1_jwt}"})
    assert_true(res_other.status_code == 403, "Employee 1 blocked from viewing Employee 2's record (403 Forbidden)")

    # HR Admin viewing Employee 2's record -> 200 OK
    res_admin_view_emp = client.get(f"/api/users/{user2_id}", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_admin_view_emp.status_code == 200, "HR Admin can view any specific employee's record (200 OK)")

    # Employee list scoping on /api/users
    limiter.reset()
    res_emp_list = client.get("/api/users", headers={"Authorization": f"Bearer {emp1_jwt}"})
    assert_true(res_emp_list.status_code == 200 and res_emp_list.json()["count"] == 1, "Employee /api/users returns STRICTLY 1 record (self)")

    res_admin_list = client.get("/api/users", headers={"Authorization": f"Bearer {admin_jwt}"})
    assert_true(res_admin_list.status_code == 200 and res_admin_list.json()["count"] >= 3, "HR Admin /api/users returns ALL company records")

    # =========================================================
    # 5. 2-MINUTE INACTIVITY SESSION EXPIRATION TEST
    # =========================================================
    print("\n--- Testing 2-Minute Inactivity Auto-Expiration ---")
    limiter.reset()

    # Active user request -> updates last_activity
    res_active = client.get("/api/auth/me", headers={"Authorization": f"Bearer {emp1_jwt}"})
    assert_true(res_active.status_code == 200, "Active session succeeds (200 OK)")

    # Simulate 130 seconds (over 2 minutes) of inactivity in the database for Employee 1
    stale_timestamp = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=130)).isoformat()
    conn = get_db_connection()
    conn.execute("UPDATE users SET last_activity = ? WHERE id = ?", (stale_timestamp, user1_id))
    conn.commit()
    conn.close()

    # Request after 2 minutes of idle time -> 401 Unauthorized
    res_idle = client.get("/api/auth/me", headers={"Authorization": f"Bearer {emp1_jwt}"})
    assert_true(res_idle.status_code == 401, "Stale session (> 2 min idle) rejected with 401 Unauthorized")
    assert_true(res_idle.json().get("inactivity_logout") is True or "inactivity" in str(res_idle.json()).lower(), "Response indicates inactivity logout")

    # =========================================================
    # 6. RATE LIMITING (6 REQUESTS MAX LIMIT) TEST
    # =========================================================
    print("\n--- Testing 6 Requests Max Rate Limiter ---")
    limiter.reset()

    # Send 6 rapid requests -> all 6 should succeed
    for i in range(1, 7):
        res_rl = client.get("/api/health")
        assert_true(res_rl.status_code == 200, f"Rate limit: Request #{i} allowed (200 OK)")

    # 7th request -> Intercepted with 429 Too Many Requests
    res_blocked = client.get("/api/health")
    assert_true(res_blocked.status_code == 429, "Rate limit: Request #7 is blocked (429 Too Many Requests)")
    assert_true("rate limit" in str(res_blocked.json()).lower(), "Response message explains rate limit quota")

    print("\n=========================================================")
    print("ALL ADVANCED SECURITY, RATE LIMIT & RBAC TESTS PASSED!")
    print("=========================================================\n")

if __name__ == "__main__":
    run_tests()
