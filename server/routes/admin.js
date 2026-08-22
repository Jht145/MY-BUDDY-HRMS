const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth & HR_ADMIN role check to all admin routes
router.use(verifyToken);
router.use(requireRole('HR_ADMIN'));

/**
 * Prompt 4.2: Admin Company-wide metrics & dashboard counts
 */
router.get('/overview', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_email_verified = 1').get().count;
  const flaggedAttendance = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE approval_status IN ('PENDING_ADMIN_APPROVAL', 'REJECTED')").get().count;
  const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leave_requests WHERE leave_status = 'PENDING'").get().count;

  return res.status(200).json({
    success: true,
    data: {
      totalUsers,
      verifiedUsers,
      flaggedAttendance,
      pendingLeaves
    }
  });
});

/**
 * Prompt 4.2: Interactive Employee Card Directory with search and filters
 */
router.get('/employees', (req, res) => {
  const search = req.query.search;
  const role = req.query.role;

  let query = `
    SELECT id as user_id, id, employee_id, first_name, last_name, email, role, phone, address,
           profile_picture_url, job_title, department, joining_date, documents_url,
           salary_base, salary_allowances, salary_deductions, net_salary,
           leave_balance_paid, leave_balance_sick, is_email_verified,
           failed_login_attempts, locked_until, created_at
    FROM users WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s);
  }

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  query += ' ORDER BY id ASC';
  const rows = db.prepare(query).all(...params);

  const now = new Date();
  const employees = rows.map(r => {
    let isLocked = false;
    if (r.locked_until) {
      const lockedTime = new Date(r.locked_until);
      if (lockedTime > now) isLocked = true;
    }

    return {
      user_id: r.user_id,
      id: r.id,
      employee_id: r.employee_id,
      first_name: r.first_name,
      last_name: r.last_name,
      full_name: `${r.first_name} ${r.last_name}`,
      email: r.email,
      role: r.role,
      phone: r.phone || 'Not provided',
      address: r.address || 'Not provided',
      profile_picture_url: r.profile_picture_url,
      job_title: r.job_title,
      department: r.department,
      joining_date: r.joining_date,
      documents_url: r.documents_url,
      salary_base: Number(r.salary_base || 0),
      salary_allowances: Number(r.salary_allowances || 0),
      salary_deductions: Number(r.salary_deductions || 0),
      net_salary: Number(r.net_salary || 0),
      leave_balance_paid: r.leave_balance_paid,
      leave_balance_sick: r.leave_balance_sick,
      is_email_verified: Boolean(r.is_email_verified),
      is_verified: Boolean(r.is_email_verified),
      is_locked: isLocked
    };
  });

  return res.status(200).json({ success: true, count: employees.length, employees });
});

/**
 * Prompt 4.2: Global Employee Context Switcher
 * Allows HR Officers to inspect any individual employee's view
 * with read/edit capabilities (Profile, Attendance, Leaves, Payroll).
 */
router.get('/employees/:target_user_id/context-view', (req, res) => {
  const targetUserId = parseInt(req.params.target_user_id, 10);
  const u = db.prepare(`
    SELECT id, employee_id, first_name, last_name, email, role, phone, address,
           profile_picture_url, job_title, department, joining_date, documents_url,
           salary_base, salary_allowances, salary_deductions, net_salary,
           leave_balance_paid, leave_balance_sick, is_email_verified, created_at
    FROM users WHERE id = ?
  `).get(targetUserId);

  if (!u) {
    return res.status(404).json({ success: false, message: 'Employee not found.' });
  }

  const attRows = db.prepare(`
    SELECT attendance_id, attendance_date, check_in_time, check_out_time,
           is_within_geofence, attendance_status, approval_status, admin_comment
    FROM attendance WHERE user_id = ? ORDER BY attendance_date DESC LIMIT 10
  `).all(targetUserId);

  const leaveRows = db.prepare(`
    SELECT leave_id, leave_type, start_date, end_date, leave_reason, leave_status, admin_comment
    FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC
  `).all(targetUserId);

  const payRows = db.prepare(`
    SELECT payroll_id, salary_base, salary_allowances, salary_deductions, net_salary, updated_at
    FROM payroll WHERE user_id = ? ORDER BY payroll_id DESC
  `).all(targetUserId);

  return res.status(200).json({
    success: true,
    context_user: {
      user_id: u.id,
      employee_id: u.employee_id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      address: u.address,
      profile_picture_url: u.profile_picture_url,
      job_title: u.job_title,
      department: u.department,
      joining_date: u.joining_date,
      documents_url: u.documents_url,
      salary_base: Number(u.salary_base || 0),
      salary_allowances: Number(u.salary_allowances || 0),
      salary_deductions: Number(u.salary_deductions || 0),
      net_salary: Number(u.net_salary || 0),
      leave_balance_paid: u.leave_balance_paid,
      leave_balance_sick: u.leave_balance_sick,
      is_email_verified: Boolean(u.is_email_verified)
    },
    attendance_logs: attRows.map(r => ({ ...r, is_within_geofence: Boolean(r.is_within_geofence) })),
    leave_requests: leaveRows,
    payroll_records: payRows.map(r => ({
      ...r,
      salary_base: Number(r.salary_base),
      salary_allowances: Number(r.salary_allowances),
      salary_deductions: Number(r.salary_deductions),
      net_salary: Number(r.net_salary)
    }))
  });
});

/**
 * Unlock locked account
 */
router.patch('/employees/:target_user_id/unlock', (req, res) => {
  const targetUserId = parseInt(req.params.target_user_id, 10);
  db.prepare(`
    UPDATE users 
    SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(targetUserId);

  return res.status(200).json({ success: true, message: `Employee #${targetUserId} account unlocked.` });
});

module.exports = router;
