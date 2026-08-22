from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
import secrets
import sqlite3
import datetime

from backend.db import get_db
from backend.schemas import SignupRequest, LoginRequest, VerifyEmailRequest
from backend.security import validate_password_strength, hash_password, verify_password, create_access_token
from backend.middleware import get_current_user

router = APIRouter(tags=["Authentication"])

MAX_FAILED_TRIALS = 3
LOCKOUT_MINUTES = 15

@router.post("/signup", status_code=status.HTTP_201_CREATED)
@router.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Registration endpoint (/signup and /api/auth/signup)
    Accepts: employee_id, first_name, last_name, email, password, role
    Validates: Password strength, duplicate email, duplicate employee_id
    """
    clean_email = str(payload.email).strip().lower()
    clean_emp_id = payload.employee_id.strip()

    # 1. Password Strength Validation
    is_strong, strength_msg, details = validate_password_strength(payload.password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": strength_msg,
                "errors": {"password": strength_msg},
                "password_details": details
            }
        )

    cursor = db.cursor()

    # 2. Duplicate Email Check
    cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "message": "An account with this email address already exists.",
                "field": "email"
            }
        )

    # 3. Duplicate Employee ID Check
    cursor.execute("SELECT id FROM users WHERE employee_id = ?", (clean_emp_id,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "message": f'Employee ID "{clean_emp_id}" is already registered.',
                "field": "employee_id"
            }
        )

    # 4. Hash password & generate verification token
    password_hash = hash_password(payload.password)
    verification_token = secrets.token_hex(32)
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, is_verified, verification_token, failed_login_attempts, locked_until, last_activity)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, NULL, ?)
    """, (
        clean_emp_id,
        payload.first_name.strip(),
        payload.last_name.strip(),
        clean_email,
        password_hash,
        payload.role,
        verification_token,
        now_str
    ))
    db.commit()
    user_id = cursor.lastrowid

    return {
        "success": True,
        "message": "User registration successful! Please verify your email to activate your account.",
        "data": {
            "user_id": user_id,
            "employee_id": clean_emp_id,
            "first_name": payload.first_name.strip(),
            "last_name": payload.last_name.strip(),
            "email": clean_email,
            "role": payload.role,
            "is_verified": False,
            "verification_token": verification_token
        }
    }

@router.post("/login")
@router.post("/api/auth/login")
async def login(payload: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Login endpoint (/login and /api/auth/login)
    Features:
    - 3-trial account lockout on incorrect attempts
    - Rate limit feedback
    - Email verification check
    - Session JWT issuance
    """
    clean_email = str(payload.email).strip().lower()
    cursor = db.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Invalid email or password."}
        )

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Check if Account is currently Locked
    if user["locked_until"]:
        try:
            lock_time = datetime.datetime.fromisoformat(user["locked_until"])
            if lock_time.tzinfo is None:
                lock_time = lock_time.replace(tzinfo=datetime.timezone.utc)
            if now < lock_time:
                remaining_secs = int((lock_time - now).total_seconds())
                remaining_mins = max(1, remaining_secs // 60)
                return JSONResponse(
                    status_code=status.HTTP_423_LOCKED,
                    content={
                        "success": False,
                        "account_locked": True,
                        "message": f"Account is locked due to 3 consecutive failed login attempts. Please try again in {remaining_mins} minute(s) or contact HR Admin.",
                        "remaining_seconds": remaining_secs
                    }
                )
            else:
                # Lockout duration has passed; automatically unlock
                cursor.execute("UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?", (user["id"],))
                db.commit()
        except Exception:
            pass

    # 2. Check Password Validity
    is_valid_pass = verify_password(payload.password, user["password_hash"])

    if not is_valid_pass:
        # Increment failed login attempts
        new_failed = (user["failed_login_attempts"] or 0) + 1

        if new_failed >= MAX_FAILED_TRIALS:
            lockout_until = (now + datetime.timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = ?, locked_until = ? 
                WHERE id = ?
            """, (new_failed, lockout_until, user["id"]))
            db.commit()

            return JSONResponse(
                status_code=status.HTTP_423_LOCKED,
                content={
                    "success": False,
                    "account_locked": True,
                    "trials_remaining": 0,
                    "message": f"Account locked: 3 consecutive incorrect login trials reached. Locked for {LOCKOUT_MINUTES} minutes."
                }
            )
        else:
            cursor.execute("UPDATE users SET failed_login_attempts = ? WHERE id = ?", (new_failed, user["id"]))
            db.commit()
            trials_remaining = MAX_FAILED_TRIALS - new_failed

            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "success": False,
                    "trials_remaining": trials_remaining,
                    "message": f"Invalid email or password. You have {trials_remaining} trial(s) remaining before account lockout."
                }
            )

    # 3. Successful password validation -> Reset failed attempts & update activity
    cursor.execute("""
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL, last_activity = ? 
        WHERE id = ?
    """, (now.isoformat(), user["id"]))
    db.commit()

    # 4. Check email verification status
    if user["is_verified"] == 0:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "success": False,
                "is_verified": False,
                "message": "Account email has not been verified. Please complete email verification before logging in.",
                "email": user["email"],
                "verification_token": user["verification_token"]
            }
        )

    # 5. Generate JWT token containing user_id, employee_id, role, and email
    token_payload = {
        "user_id": user["id"],
        "employee_id": user["employee_id"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "email": user["email"],
        "role": user["role"]
    }
    token = create_access_token(token_payload)

    return {
        "success": True,
        "message": "Login successful.",
        "token": token,
        "user": {
            "id": user["id"],
            "user_id": user["id"],
            "employee_id": user["employee_id"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": bool(user["is_verified"])
        }
    }

@router.post("/verify-email")
@router.post("/api/auth/verify-email")
async def verify_email(payload: VerifyEmailRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Email verification endpoint to activate registered accounts.
    """
    cursor = db.cursor()
    user = None

    if payload.token:
        cursor.execute("SELECT * FROM users WHERE verification_token = ?", (payload.token.strip(),))
        user = cursor.fetchone()
    elif payload.email:
        cursor.execute("SELECT * FROM users WHERE email = ?", (payload.email.strip().lower(),))
        user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Invalid or expired verification token."}
        )

    cursor.execute("""
        UPDATE users 
        SET is_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    """, (user["id"],))
    db.commit()

    return {
        "success": True,
        "message": f"Email verified successfully for {user['email']}. You may now log in.",
        "email": user["email"]
    }

@router.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    """
    Protected endpoint to retrieve current authenticated user profile.
    """
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, employee_id, first_name, last_name, email, role, is_verified, created_at, last_activity, failed_login_attempts, locked_until 
        FROM users WHERE id = ?
    """, (current_user["user_id"],))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User profile not found."}
        )

    return {
        "success": True,
        "user": {
            "id": user["id"],
            "employee_id": user["employee_id"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": bool(user["is_verified"]),
            "last_activity": user["last_activity"],
            "created_at": user["created_at"]
        }
    }
