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
    """
    Initializes all database tables enforcing exact field names, ENUMs,
    and relational models specified in Prompt 1 of Dayflow HRMS.
    """
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
            role TEXT NOT NULL CHECK(role IN ('EMPLOYEE', 'HR_ADMIN')),
            phone TEXT,
            address TEXT,
            profile_picture_url TEXT,
            job_title TEXT DEFAULT 'Software Engineer',
            department TEXT DEFAULT 'Engineering',
            joining_date DATE DEFAULT (DATE('now')),
            documents_url TEXT DEFAULT 'https://mybuddyhrms.com/docs/employee_records.pdf',
            salary_base DECIMAL(10, 2) DEFAULT 5000.00,
            salary_allowances DECIMAL(10, 2) DEFAULT 500.00,
            salary_deductions DECIMAL(10, 2) DEFAULT 250.00,
            net_salary DECIMAL(10, 2) DEFAULT 5250.00,
            monthly_wage DECIMAL(10, 2) DEFAULT 5000.00,
            basic_salary DECIMAL(10, 2) DEFAULT 2500.00,
            hra DECIMAL(10, 2) DEFAULT 1250.00,
            standard_allowance DECIMAL(10, 2) DEFAULT 250.00,
            performance_bonus DECIMAL(10, 2) DEFAULT 250.00,
            lta DECIMAL(10, 2) DEFAULT 250.00,
            fixed_allowance DECIMAL(10, 2) DEFAULT 500.00,
            pf_employee DECIMAL(10, 2) DEFAULT 300.00,
            pf_employer DECIMAL(10, 2) DEFAULT 300.00,
            professional_tax DECIMAL(10, 2) DEFAULT 200.00,
            salary_config TEXT DEFAULT NULL,
            leave_balance_paid INTEGER DEFAULT 18,
            leave_balance_sick INTEGER DEFAULT 10,
            is_email_verified INTEGER NOT NULL DEFAULT 0,
            verification_token TEXT,
            failed_login_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until DATETIME DEFAULT NULL,
            last_activity DATETIME DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS attendance (
            attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            attendance_date DATE NOT NULL,
            check_in_time TEXT,
            check_out_time TEXT,
            check_in_photo_url TEXT,
            check_out_photo_url TEXT,
            check_in_latitude REAL NOT NULL,
            check_in_longitude REAL NOT NULL,
            is_within_geofence INTEGER NOT NULL,
            attendance_status TEXT NOT NULL CHECK(attendance_status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE')),
            approval_status TEXT NOT NULL CHECK(approval_status IN ('AUTO_APPROVED', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'REJECTED')),
            admin_comment TEXT,
            verified_by INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(verified_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS leave_requests (
            leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            leave_type TEXT NOT NULL CHECK(leave_type IN ('PAID', 'SICK', 'UNPAID')),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            leave_reason TEXT NOT NULL,
            leave_status TEXT NOT NULL CHECK(leave_status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
            admin_comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS payroll (
            payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            salary_base DECIMAL(10, 2) NOT NULL,
            salary_allowances DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            salary_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            net_salary DECIMAL(10, 2) NOT NULL,
            monthly_wage DECIMAL(10, 2) DEFAULT 5000.00,
            basic_salary DECIMAL(10, 2) DEFAULT 2500.00,
            hra DECIMAL(10, 2) DEFAULT 1250.00,
            standard_allowance DECIMAL(10, 2) DEFAULT 250.00,
            performance_bonus DECIMAL(10, 2) DEFAULT 250.00,
            lta DECIMAL(10, 2) DEFAULT 250.00,
            fixed_allowance DECIMAL(10, 2) DEFAULT 500.00,
            pf_employee DECIMAL(10, 2) DEFAULT 300.00,
            pf_employer DECIMAL(10, 2) DEFAULT 300.00,
            professional_tax DECIMAL(10, 2) DEFAULT 200.00,
            salary_config TEXT DEFAULT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    # Migration helpers to add any missing exact fields in existing database
    cursor.execute("PRAGMA table_info(users)")
    user_cols = [row["name"] for row in cursor.fetchall()]

    new_user_cols = {
        "documents_url": "TEXT DEFAULT 'https://mybuddyhrms.com/docs/employee_records.pdf'",
        "salary_base": "DECIMAL(10, 2) DEFAULT 5000.00",
        "salary_allowances": "DECIMAL(10, 2) DEFAULT 500.00",
        "salary_deductions": "DECIMAL(10, 2) DEFAULT 250.00",
        "net_salary": "DECIMAL(10, 2) DEFAULT 5250.00",
        "monthly_wage": "DECIMAL(10, 2) DEFAULT 5000.00",
        "basic_salary": "DECIMAL(10, 2) DEFAULT 2500.00",
        "hra": "DECIMAL(10, 2) DEFAULT 1250.00",
        "standard_allowance": "DECIMAL(10, 2) DEFAULT 250.00",
        "performance_bonus": "DECIMAL(10, 2) DEFAULT 250.00",
        "lta": "DECIMAL(10, 2) DEFAULT 250.00",
        "fixed_allowance": "DECIMAL(10, 2) DEFAULT 500.00",
        "pf_employee": "DECIMAL(10, 2) DEFAULT 300.00",
        "pf_employer": "DECIMAL(10, 2) DEFAULT 300.00",
        "professional_tax": "DECIMAL(10, 2) DEFAULT 200.00",
        "salary_config": "TEXT DEFAULT NULL",
        "is_email_verified": "INTEGER NOT NULL DEFAULT 0",
        "verification_token": "TEXT",
        "failed_login_attempts": "INTEGER NOT NULL DEFAULT 0",
        "locked_until": "DATETIME DEFAULT NULL",
        "last_activity": "DATETIME DEFAULT NULL"
    }

    for col, col_type in new_user_cols.items():
        if col not in user_cols:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")

    # Payroll column migrations
    cursor.execute("PRAGMA table_info(payroll)")
    pay_cols = [row["name"] for row in cursor.fetchall()]
    new_pay_cols = {
        "monthly_wage": "DECIMAL(10, 2) DEFAULT 5000.00",
        "basic_salary": "DECIMAL(10, 2) DEFAULT 2500.00",
        "hra": "DECIMAL(10, 2) DEFAULT 1250.00",
        "standard_allowance": "DECIMAL(10, 2) DEFAULT 250.00",
        "performance_bonus": "DECIMAL(10, 2) DEFAULT 250.00",
        "lta": "DECIMAL(10, 2) DEFAULT 250.00",
        "fixed_allowance": "DECIMAL(10, 2) DEFAULT 500.00",
        "pf_employee": "DECIMAL(10, 2) DEFAULT 300.00",
        "pf_employer": "DECIMAL(10, 2) DEFAULT 300.00",
        "professional_tax": "DECIMAL(10, 2) DEFAULT 200.00",
        "salary_config": "TEXT DEFAULT NULL"
    }
    for col, col_type in new_pay_cols.items():
        if col not in pay_cols:
            cursor.execute(f"ALTER TABLE payroll ADD COLUMN {col} {col_type}")

    # Synchronize is_email_verified from is_verified if present
    if "is_verified" in user_cols:
        cursor.execute("UPDATE users SET is_email_verified = 1 WHERE is_verified = 1")
    cursor.execute("UPDATE users SET is_email_verified = 1 WHERE email IN ('admin@mybuddyhrms.com', 'john.doe@mybuddyhrms.com')")

    # Table structure migrations for Prompt 1 exact schema
    cursor.execute("PRAGMA table_info(leave_requests)")
    leave_cols = [row["name"] for row in cursor.fetchall()]
    if leave_cols and "leave_id" not in leave_cols:
        cursor.execute("DROP TABLE IF EXISTS leave_requests")
        cursor.execute("""
            CREATE TABLE leave_requests (
                leave_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                leave_type TEXT NOT NULL CHECK(leave_type IN ('PAID', 'SICK', 'UNPAID')),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                leave_reason TEXT NOT NULL,
                leave_status TEXT NOT NULL CHECK(leave_status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
                admin_comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

    cursor.execute("PRAGMA table_info(attendance)")
    att_cols = [row["name"] for row in cursor.fetchall()]
    if att_cols and "attendance_id" not in att_cols:
        cursor.execute("DROP TABLE IF EXISTS attendance")
        cursor.execute("""
            CREATE TABLE attendance (
                attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                attendance_date DATE NOT NULL,
                check_in_time TEXT,
                check_out_time TEXT,
                check_in_photo_url TEXT,
                check_out_photo_url TEXT,
                check_in_latitude REAL NOT NULL,
                check_in_longitude REAL NOT NULL,
                is_within_geofence INTEGER NOT NULL,
                attendance_status TEXT NOT NULL CHECK(attendance_status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE')),
                approval_status TEXT NOT NULL CHECK(approval_status IN ('AUTO_APPROVED', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'REJECTED')),
                admin_comment TEXT,
                verified_by INTEGER,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(verified_by) REFERENCES users(id)
            )
        """)

    cursor.execute("PRAGMA table_info(payroll)")
    pay_cols = [row["name"] for row in cursor.fetchall()]
    if pay_cols and "payroll_id" not in pay_cols:
        cursor.execute("DROP TABLE IF EXISTS payroll")
        cursor.execute("""
            CREATE TABLE payroll (
                payroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                salary_base DECIMAL(10, 2) NOT NULL,
                salary_allowances DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                salary_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                net_salary DECIMAL(10, 2) NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

    # Seed announcements if empty
    cursor.execute("SELECT COUNT(*) as count FROM announcements")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
            INSERT INTO announcements (title, message)
            VALUES 
            ('Company Town Hall 2026', 'Quarterly organizational Town Hall will be held this Friday at 3:00 PM.'),
            ('Health Insurance Open Enrollment', 'Submit any changes to your family medical insurance by end of the month.')
        """)
        conn.commit()

    conn.commit()

    # Seed demo users if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    count = cursor.fetchone()["count"]

    if count == 0:
        print("[INFO] Seeding initial Dayflow HRMS demo accounts & records...")
        admin_pass_hash = bcrypt.hashpw(b"Admin@12345", bcrypt.gensalt()).decode('utf-8')
        emp_pass_hash = bcrypt.hashpw(b"Employee@12345", bcrypt.gensalt()).decode('utf-8')

        # 1. Admin Account (Sarah Jenkins)
        cursor.execute("""
            INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, phone, address, profile_picture_url, job_title, department, joining_date, documents_url, salary_base, salary_allowances, salary_deductions, net_salary, is_email_verified, leave_balance_paid, leave_balance_sick)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 24, 12)
        """, (
            'EMP-001', 'Sarah', 'Jenkins', 'admin@mybuddyhrms.com', admin_pass_hash, 'HR_ADMIN',
            '+1 (555) 234-5678', '124 Corporate HQ, Bangalore', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            'HR Director', 'Human Resources', '2025-01-10', 'https://mybuddyhrms.com/docs/sarah_records.pdf',
            8500.00, 850.00, 425.00, 8925.00
        ))

        # 2. Employee Account (John Doe)
        cursor.execute("""
            INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, phone, address, profile_picture_url, job_title, department, joining_date, documents_url, salary_base, salary_allowances, salary_deductions, net_salary, is_email_verified, leave_balance_paid, leave_balance_sick)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 18, 10)
        """, (
            'EMP-002', 'John', 'Doe', 'john.doe@mybuddyhrms.com', emp_pass_hash, 'EMPLOYEE',
            '+1 (555) 876-5432', '45 Greenfield Ave, Bangalore', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            'Senior Fullstack Engineer', 'Engineering', '2025-06-15', 'https://mybuddyhrms.com/docs/john_records.pdf',
            6200.00, 620.00, 310.00, 6510.00
        ))

        conn.commit()

        cursor.execute("SELECT id FROM users WHERE email = 'john.doe@mybuddyhrms.com'")
        emp_id = cursor.fetchone()["id"]

        # Seed sample attendance record
        cursor.execute("""
            INSERT INTO attendance (user_id, attendance_date, check_in_time, check_out_time, check_in_photo_url, check_in_latitude, check_in_longitude, is_within_geofence, attendance_status, approval_status, admin_comment)
            VALUES (?, DATE('now', '-1 day'), '09:15:00', '17:45:00', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 12.9716, 77.5946, 1, 'PRESENT', 'AUTO_APPROVED', 'In office geofence')
        """, (emp_id,))

        cursor.execute("""
            INSERT INTO attendance (user_id, attendance_date, check_in_time, check_in_photo_url, check_in_latitude, check_in_longitude, is_within_geofence, attendance_status, approval_status, admin_comment)
            VALUES (?, DATE('now'), '09:30:00', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 13.0827, 80.2707, 0, 'PRESENT', 'PENDING_ADMIN_APPROVAL', 'Remote location check-in outside 100m geofence')
        """, (emp_id,))

        # Seed sample leave request
        cursor.execute("""
            INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, leave_reason, leave_status, admin_comment)
            VALUES (?, 'PAID', '2026-09-01', '2026-09-03', 'Annual family vacation trip', 'PENDING', NULL)
        """, (emp_id,))

        # Seed sample payroll record
        cursor.execute("""
            INSERT INTO payroll (user_id, salary_base, salary_allowances, salary_deductions, net_salary)
            VALUES (?, 6200.00, 620.00, 310.00, 6510.00)
        """, (emp_id,))

        # Seed sample announcement
        cursor.execute("""
            INSERT INTO announcements (title, message)
            VALUES 
            ('Company Town Hall 2026', 'Quarterly organizational Town Hall will be held this Friday at 3:00 PM.'),
            ('Health Insurance Open Enrollment', 'Submit any changes to your family medical insurance by end of the month.')
        """)

        conn.commit()
        print("[INFO] Database seeded with Dayflow HRMS models.")

    conn.close()

def get_db():
    """FastAPI dependency for database session."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

init_db()
