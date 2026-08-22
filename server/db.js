const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'hrms.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Step 1: Initialize full database schema adhering to exact Data Field Dictionary (Prompt 1)
db.exec(`
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
`);

// Migration helpers to ensure exact column names are present
const userColumns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
const newCols = {
  documents_url: "TEXT DEFAULT 'https://mybuddyhrms.com/docs/employee_records.pdf'",
  salary_base: "DECIMAL(10, 2) DEFAULT 5000.00",
  salary_allowances: "DECIMAL(10, 2) DEFAULT 500.00",
  salary_deductions: "DECIMAL(10, 2) DEFAULT 250.00",
  net_salary: "DECIMAL(10, 2) DEFAULT 5250.00",
  is_email_verified: "INTEGER NOT NULL DEFAULT 0",
  verification_token: "TEXT",
  failed_login_attempts: "INTEGER NOT NULL DEFAULT 0",
  locked_until: "DATETIME DEFAULT NULL",
  last_activity: "DATETIME DEFAULT NULL"
};

for (const [col, colType] of Object.entries(newCols)) {
  if (!userColumns.includes(col)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} ${colType}`);
  }
}

if (userColumns.includes('is_verified')) {
  db.exec('UPDATE users SET is_email_verified = 1 WHERE is_verified = 1');
}
db.exec("UPDATE users SET is_email_verified = 1 WHERE email IN ('admin@mybuddyhrms.com', 'john.doe@mybuddyhrms.com')");

// Seed initial demo users if none exist
function seedDatabase() {
  const result = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (result.count === 0) {
    console.log('Seeding initial Dayflow HRMS demo accounts...');

    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('Admin@12345', salt);
    const employeePasswordHash = bcrypt.hashSync('Employee@12345', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (
        employee_id, first_name, last_name, email, password_hash, role,
        phone, address, profile_picture_url, job_title, department,
        joining_date, documents_url, salary_base, salary_allowances,
        salary_deductions, net_salary, leave_balance_paid, leave_balance_sick,
        is_email_verified
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertUser.run(
      'EMP-001', 'Sarah', 'Jenkins', 'admin@mybuddyhrms.com', adminPasswordHash, 'HR_ADMIN',
      '+1 (555) 234-5678', '124 Corporate HQ, Bangalore', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      'HR Director', 'Human Resources', '2025-01-10', 'https://mybuddyhrms.com/docs/sarah_records.pdf',
      8500.00, 850.00, 425.00, 8925.00, 24, 12
    );

    insertUser.run(
      'EMP-002', 'John', 'Doe', 'john.doe@mybuddyhrms.com', employeePasswordHash, 'EMPLOYEE',
      '+1 (555) 876-5432', '45 Greenfield Ave, Bangalore', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'Senior Fullstack Engineer', 'Engineering', '2025-06-15', 'https://mybuddyhrms.com/docs/john_records.pdf',
      6200.00, 620.00, 310.00, 6510.00, 18, 10
    );

    const emp = db.prepare("SELECT id FROM users WHERE email = 'john.doe@mybuddyhrms.com'").get();
    if (emp) {
      db.prepare(`
        INSERT INTO attendance (user_id, attendance_date, check_in_time, check_out_time, check_in_photo_url, check_in_latitude, check_in_longitude, is_within_geofence, attendance_status, approval_status, admin_comment)
        VALUES (?, DATE('now', '-1 day'), '09:15:00', '17:45:00', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 12.9716, 77.5946, 1, 'PRESENT', 'AUTO_APPROVED', 'In office geofence')
      `).run(emp.id);

      db.prepare(`
        INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, leave_reason, leave_status)
        VALUES (?, 'PAID', '2026-09-01', '2026-09-03', 'Annual family vacation trip', 'PENDING')
      `).run(emp.id);

      db.prepare(`
        INSERT INTO payroll (user_id, salary_base, salary_allowances, salary_deductions, net_salary)
        VALUES (?, 6200.00, 620.00, 310.00, 6510.00)
      `).run(emp.id);
    }
  }

  // Seed announcements if empty
  const annCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
  if (annCount.count === 0) {
    db.prepare(`
      INSERT INTO announcements (title, message)
      VALUES 
      ('Company Town Hall 2026', 'Quarterly organizational Town Hall will be held this Friday at 3:00 PM.'),
      ('Health Insurance Open Enrollment', 'Submit any changes to your family medical insurance by end of the month.')
    `).run();
  }
}

seedDatabase();

module.exports = db;
