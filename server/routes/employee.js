const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all employee routes
router.use(verifyToken);

/**
 * Prompt 4.1: Employee Dashboard Overview
 * Displays quick-access metrics for Personal Profile, Attendance logs,
 * active Leave Requests, and recent announcements.
 */
router.get('/dashboard', (req, res) => {
  const userId = req.user.user_id;

  // 1. Profile
  const u = db.prepare(`
    SELECT id, employee_id, first_name, last_name, email, role, phone, address, profile_picture_url,
           job_title, department, joining_date, documents_url, salary_base, net_salary,
           leave_balance_paid, leave_balance_sick, is_email_verified
    FROM users WHERE id = ?
  `).get(userId);

  if (!u) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // 2. Recent Attendance logs (latest 5)
  const attRows = db.prepare(`
    SELECT attendance_id, attendance_date, check_in_time, check_out_time,
           is_within_geofence, attendance_status, approval_status, admin_comment
    FROM attendance WHERE user_id = ? ORDER BY attendance_date DESC, attendance_id DESC LIMIT 5
  `).all(userId);

  // 3. Active Leave Requests (latest 5)
  const leaveRows = db.prepare(`
    SELECT leave_id, leave_type, start_date, end_date, leave_reason, leave_status, admin_comment, created_at
    FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
  `).all(userId);

  // 4. Recent Announcements (latest 3)
  const announcementRows = db.prepare(`
    SELECT id, title, message, posted_at FROM announcements ORDER BY posted_at DESC LIMIT 3
  `).all();

  return res.status(200).json({
    success: true,
    data: {
      profile: {
        user_id: u.id,
        id: u.id,
        employee_id: u.employee_id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        job_title: u.job_title,
        department: u.department,
        joining_date: u.joining_date,
        documents_url: u.documents_url,
        salary_base: Number(u.salary_base || 0),
        net_salary: Number(u.net_salary || 0),
        leave_balance_paid: u.leave_balance_paid,
        leave_balance_sick: u.leave_balance_sick,
        is_email_verified: Boolean(u.is_email_verified)
      },
      recent_attendance: attRows.map(r => ({ ...r, is_within_geofence: Boolean(r.is_within_geofence) })),
      active_leave_requests: leaveRows,
      announcements: announcementRows,
      securityContext: {
        scope: 'USER_RESTRICTED',
        authorizedUserId: userId,
        role: req.user.role
      }
    }
  });
});

module.exports = router;
