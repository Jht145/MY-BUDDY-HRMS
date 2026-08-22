import sqlite3
import os
import bcrypt

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hrms.db'))

def get_db_connection():
    """Create and return a SQLite database connection configured with Row factory."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db():
    """Initializes all database tables as defined in README.md and applies migrations."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('HR_ADMIN', 'EMPLOYEE')),
            phone TEXT,
            address TEXT,
            profile_picture_url TEXT,
            job_title TEXT DEFAULT 'Software Engineer',
            department TEXT DEFAULT 'Engineering',
            joining_date DATE DEFAULT (DATE('now')),
            base_salary DECIMAL(10, 2) DEFAULT 5000.00,
            leave_balance_paid INTEGER DEFAULT 18,
            leave_balance_sick INTEGER DEFAULT 10,
            is_verified INTEGER NOT NULL DEFAULT 0,
            verification_token TEXT,
            failed_login_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until DATETIME DEFAULT NULL,
            last_activity DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS attendance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            check_in_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            check_out_timestamp DATETIME DEFAULT NULL,
            check_in_photo_url TEXT,
            check_out_photo_url TEXT,
            check_in_latitude REAL NOT NULL,
            check_in_longitude REAL NOT NULL,
            distance_meters REAL NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('PRESENT', 'PENDING_ADMIN_APPROVAL', 'FLAGGED', 'REJECTED')),
            approval_notes TEXT,
            verified_by INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(verified_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS leave_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('PAID', 'SICK', 'UNPAID')),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_count INTEGER NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
            admin_comments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS payroll_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            pay_period TEXT NOT NULL,
            base_salary DECIMAL(10, 2) NOT NULL,
            allowances DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            net_pay DECIMAL(10, 2) NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('DRAFT', 'FINALIZED', 'PAID')) DEFAULT 'FINALIZED',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    """)
    conn.commit()

    # Migration helpers for existing users table columns
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [row["name"] for row in cursor.fetchall()]

    new_cols = {
        "phone": "TEXT",
        "address": "TEXT",
        "profile_picture_url": "TEXT",
        "job_title": "TEXT DEFAULT 'Staff'",
        "department": "TEXT DEFAULT 'General'",
        "joining_date": "DATE DEFAULT '2026-01-15'",
        "base_salary": "DECIMAL(10, 2) DEFAULT 5000.00",
        "leave_balance_paid": "INTEGER DEFAULT 18",
        "leave_balance_sick": "INTEGER DEFAULT 10",
        "failed_login_attempts": "INTEGER NOT NULL DEFAULT 0",
        "locked_until": "DATETIME DEFAULT NULL",
        "last_activity": "DATETIME DEFAULT NULL"
    }

    for col, col_type in new_cols.items():
        if col not in user_cols:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
    conn.commit()

    # Seed demo users if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    count = cursor.fetchone()["count"]

    if count == 0:
        print("[INFO] Seeding complete demo data for MY-BUDDY-HRMS...")
        admin_pass_hash = bcrypt.hashpw(b"Admin@12345", bcrypt.gensalt()).decode('utf-8')
        emp_pass_hash = bcrypt.hashpw(b"Employee@12345", bcrypt.gensalt()).decode('utf-8')

        # 1. Admin Account
        cursor.execute("""
            INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, phone, address, job_title, department, base_salary, is_verified, leave_balance_paid, leave_balance_sick)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 24, 12)
        """, ('EMP-001', 'Sarah', 'Jenkins', 'admin@mybuddyhrms.com', admin_pass_hash, 'HR_ADMIN', '+1 (555) 234-5678', '124 Corporate HQ, Bangalore', 'HR Director', 'Human Resources', 8500.00))

        # 2. Employee Account
        cursor.execute("""
            INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, phone, address, job_title, department, base_salary, is_verified, leave_balance_paid, leave_balance_sick)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 18, 10)
        """, ('EMP-002', 'John', 'Doe', 'john.doe@mybuddyhrms.com', emp_pass_hash, 'EMPLOYEE', '+1 (555) 876-5432', '45 Greenfield Ave, Bangalore', 'Senior Fullstack Engineer', 'Engineering', 6200.00))
        
        conn.commit()

        cursor.execute("SELECT id FROM users WHERE email = 'john.doe@mybuddyhrms.com'")
        emp_id = cursor.fetchone()["id"]

        # Seed sample attendance logs
        cursor.execute("""
            INSERT INTO attendance_logs (user_id, check_in_timestamp, check_out_timestamp, check_in_photo_url, check_in_latitude, check_in_longitude, distance_meters, status)
            VALUES (?, DATETIME('now', '-1 day', '+9 hours'), DATETIME('now', '-1 day', '+17 hours'), 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 12.9716, 77.5946, 12.5, 'PRESENT')
        """, (emp_id,))

        cursor.execute("""
            INSERT INTO attendance_logs (user_id, check_in_timestamp, check_in_photo_url, check_in_latitude, check_in_longitude, distance_meters, status, approval_notes)
            VALUES (?, DATETIME('now', '+9 hours'), 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 13.0827, 80.2707, 280000.0, 'PENDING_ADMIN_APPROVAL', 'Client site visit check-in outside 100m geofence')
        """, (emp_id,))

        # Seed sample leave request
        cursor.execute("""
            INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, reason, status)
            VALUES (?, 'PAID', '2026-09-01', '2026-09-03', 3, 'Annual family vacation trip', 'PENDING')
        """, (emp_id,))

        # Seed sample payroll records
        cursor.execute("""
            INSERT INTO payroll_records (user_id, pay_period, base_salary, allowances, deductions, net_pay, status)
            VALUES (?, '2026-07', 6200.00, 500.00, 320.00, 6380.00, 'PAID')
        """, (emp_id,))

        cursor.execute("""
            INSERT INTO payroll_records (user_id, pay_period, base_salary, allowances, deductions, net_pay, status)
            VALUES (?, '2026-08', 6200.00, 500.00, 320.00, 6380.00, 'FINALIZED')
        """, (emp_id,))

        conn.commit()
        print("[INFO] Seed data loaded successfully for My Buddy HRMS.")

    conn.close()

def get_db():
    """FastAPI dependency for database session."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

init_db()
