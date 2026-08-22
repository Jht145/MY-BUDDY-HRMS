import os
import re
import datetime
import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "mybuddy_hrms_super_secret_jwt_key_2026_secure")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

def validate_password_strength(password: str):
    """
    Validates password strength according to enterprise security standards:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 numeric digit
    - At least 1 special symbol
    """
    if not password or not isinstance(password, str):
        return False, "Password is required.", {}

    min_length = len(password) >= 8
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'[0-9]', password))
    has_special = bool(re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~`]', password))

    is_valid = min_length and has_upper and has_lower and has_digit and has_special

    details = {
        "min_length": min_length,
        "has_upper": has_upper,
        "has_lower": has_lower,
        "has_digit": has_digit,
        "has_special": has_special
    }

    if not is_valid:
        missing = []
        if not min_length: missing.append("at least 8 characters")
        if not has_upper: missing.append("1 uppercase letter")
        if not has_lower: missing.append("1 lowercase letter")
        if not has_digit: missing.append("1 numeric digit")
        if not has_special: missing.append("1 special character (e.g. !@#$%^&*)")
        message = f"Password is too weak. It must contain: {', '.join(missing)}."
        return False, message, details

    return True, "Password meets security strength requirements.", details

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_hours: int = JWT_EXPIRE_HOURS) -> str:
    """Generate signed JWT token containing user identity and role."""
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=expires_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode and verify JWT token."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
