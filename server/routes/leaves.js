const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all leaves routes
router.use(verifyToken);

/**
 * Prompt 7.1: Leave Application Form Endpoint
 */
router.post('/apply', (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leave_type, start_date, end_date, leave_reason } = req.body;

    if (!leave_type || !['PAID', 'SICK', 'UNPAID'].includes(leave_type)) {
      return res.status(400).json({ success: false, message: "leave_type must be 'PAID', 'SICK', or 'UNPAID'." });
    }

    if (!start_date || !end_date || !leave_reason) {
      return res.status(400).json({ success: false, message: 'start_date, end_date, and leave_reason are required.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return res.status(400).json({ success: false, message: 'end_date cannot be earlier than start_date.' });
    }

    // Check balance
    const user = db.prepare('SELECT leave_balance_paid, leave_balance_sick FROM users WHERE id = ?').get(userId);
    const diffTime = Math.abs(end - start);
    const daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (leave_type === 'PAID' && user.leave_balance_paid < daysRequested) {
      return res.status(400).json({
        success: false,
        message: `Insufficient paid leave balance. Requested: ${daysRequested} days, Available: ${user.leave_balance_paid} days.`
      });
    }

    if (leave_type === 'SICK' && user.leave_balance_sick < daysRequested) {
      return res.status(400).json({
        success: false,
        message: `Insufficient sick leave balance. Requested: ${daysRequested} days, Available: ${user.leave_balance_sick} days.`
      });
    }

    const stmt = db.prepare(`
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, leave_reason, leave_status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `);

    const info = stmt.run(userId, leave_type, start_date, end_date, leave_reason.trim());

    return res.status(200).json({
      success: true,
      message: `Leave application for ${daysRequested} day(s) submitted to HR Administration.`,
      data: {
        leave_id: info.lastInsertRowid,
        user_id: userId,
        leave_type,
        start_date,
        end_date,
        leave_reason,
        leave_status: 'PENDING',
        days_requested: daysRequested
      }
    });
  } catch (error) {
    console.error('Leave apply error:', error);
    return res.status(500).json({ success: false, message: 'Error submitting leave request.' });
  }
});

/**
 * Prompt 7.1: View Personal Leave History
 */
router.get('/my-requests', (req, res) => {
  const userId = req.user.user_id;
  const rows = db.prepare(`
    SELECT leave_id, user_id, leave_type, start_date, end_date, leave_reason, leave_status, admin_comment, created_at
    FROM leave_requests
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  return res.status(200).json({ success: true, count: rows.length, leave_requests: rows });
});

/**
 * Prompt 7.2: Admin Leave Approval Queue
 */
router.get('/admin/queue', requireRole('HR_ADMIN'), (req, res) => {
  const rows = db.prepare(`
    SELECT l.leave_id, l.user_id, l.leave_type, l.start_date, l.end_date,
           l.leave_reason, l.leave_status, l.admin_comment, l.created_at,
           u.employee_id, u.first_name, u.last_name, u.department,
           u.leave_balance_paid, u.leave_balance_sick
    FROM leave_requests l
    JOIN users u ON l.user_id = u.id
    WHERE l.leave_status = 'PENDING'
    ORDER BY l.created_at ASC
  `).all();

  const queue = rows.map(r => ({
    leave_id: r.leave_id,
    user_id: r.user_id,
    employee_id: r.employee_id,
    employee_name: `${r.first_name} ${r.last_name}`,
    department: r.department,
    leave_type: r.leave_type,
    start_date: r.start_date,
    end_date: r.end_date,
    leave_reason: r.leave_reason,
    leave_status: r.leave_status,
    paid_balance: r.leave_balance_paid,
    sick_balance: r.leave_balance_sick,
    created_at: r.created_at
  }));

  return res.status(200).json({ success: true, count: queue.length, pending_queue: queue });
});

/**
 * Prompt 7.2: Admin Action on Leave Request
 */
router.patch('/admin/action/:leave_id', requireRole('HR_ADMIN'), (req, res) => {
  const leaveId = parseInt(req.params.leave_id, 10);
  const { leave_status, admin_comment } = req.body;

  if (!leave_status || !['APPROVED', 'REJECTED'].includes(leave_status)) {
    return res.status(400).json({ success: false, message: "leave_status must be 'APPROVED' or 'REJECTED'." });
  }

  const leave = db.prepare('SELECT * FROM leave_requests WHERE leave_id = ?').get(leaveId);
  if (!leave) {
    return res.status(404).json({ success: false, message: 'Leave request not found.' });
  }

  // Deduct balance on approval
  if (leave_status === 'APPROVED' && leave.leave_status !== 'APPROVED') {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (leave.leave_type === 'PAID') {
      db.prepare('UPDATE users SET leave_balance_paid = MAX(0, leave_balance_paid - ?) WHERE id = ?').run(days, leave.user_id);
    } else if (leave.leave_type === 'SICK') {
      db.prepare('UPDATE users SET leave_balance_sick = MAX(0, leave_balance_sick - ?) WHERE id = ?').run(days, leave.user_id);
    }
  }

  db.prepare(`
    UPDATE leave_requests
    SET leave_status = ?, admin_comment = ?, updated_at = CURRENT_TIMESTAMP
    WHERE leave_id = ?
  `).run(leave_status, admin_comment || 'Actioned by HR Admin', leaveId);

  return res.status(200).json({
    success: true,
    message: `Leave request #${leaveId} has been marked as ${leave_status}.`,
    data: { leave_id: leaveId, leave_status }
  });
});

module.exports = router;
