const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'hrms.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('HR_ADMIN', 'EMPLOYEE')),
    is_verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Seed initial demo users if none exist
function seedDatabase() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = countStmt.get();

  if (result.count === 0) {
    console.log('Seeding initial demo accounts...');

    const insertUser = db.prepare(`
      INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, is_verified, verification_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('Admin@12345', salt);
    const employeePasswordHash = bcrypt.hashSync('Employee@12345', salt);

    insertUser.run(
      'EMP-001',
      'Sarah',
      'Jenkins',
      'admin@mybuddyhrms.com',
      adminPasswordHash,
      'HR_ADMIN',
      1,
      null
    );

    insertUser.run(
      'EMP-002',
      'John',
      'Doe',
      'john.doe@mybuddyhrms.com',
      employeePasswordHash,
      'EMPLOYEE',
      1,
      null
    );

    console.log('Initial demo accounts seeded:');
    console.log('  HR Admin: admin@mybuddyhrms.com / Admin@12345');
    console.log('  Employee: john.doe@mybuddyhrms.com / Employee@12345');
  }
}

seedDatabase();

module.exports = db;
