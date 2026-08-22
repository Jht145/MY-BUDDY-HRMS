const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { isWithinOfficeGeofence, OFFICE_LATITUDE, OFFICE_LONGITUDE } = require('../utils/geofence');

const router = express.Router();

// Apply auth middleware to all attendance routes
router.use(verifyToken);

/**
 * Prompt 6.1 & 6.2: Smart Kiosk Check-In with Geofencing Verification
 */
router.post('/kiosk/check-in', (req, res) => {
  try {
    const userId = req.user.user_id;
    const { check_in_photo_url, check_in_latitude, check_in_longitude } = req.body;

    if (check_in_latitude === undefined || check_in_longitude === undefined) {
      return res.status(400).json({ success: false, message: 'check_in_latitude and check_in_longitude are required.' });
    }

    const lat = Number(check_in_latitude);
    const lon = Number(check_in_longitude);
    const photo = check_in_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    const { is_within_geofence, distance_meters } = isWithinOfficeGeofence(lat, lon);

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 8);

    let approvalStatus;
    let adminComment;

    if (is_within_geofence) {
      approvalStatus = 'AUTO_APPROVED';
      adminComment = `Office Geofence Passed: Checked in at ${distance_meters}m from office HQ.`;
    } else {
      approvalStatus = 'PENDING_ADMIN_APPROVAL';
      adminComment = `Flagged Remote: Location is ${distance_meters}m from office HQ (exceeds 100m radius).`;
    }

    const stmt = db.prepare(`
      INSERT INTO attendance (
        user_id, attendance_date, check_in_time, check_in_photo_url,
        check_in_latitude, check_in_longitude, is_within_geofence,
        attendance_status, approval_status, admin_comment
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PRESENT', ?, ?)
    `);

    const info = stmt.run(
      userId,
      todayStr,
      timeStr,
      photo,
      lat,
      lon,
      is_within_geofence ? 1 : 0,
      approvalStatus,
      adminComment
    );

    return res.status(200).json({
      success: true,
      message: is_within_geofence
        ? 'Check-in verified within office geofence and auto-approved.'
        : 'Check-in recorded outside geofence. Sent to HR Admin for location approval.',
      data: {
        attendance_id: info.lastInsertRowid,
        user_id: userId,
        attendance_date: todayStr,
        check_in_time: timeStr,
        is_within_geofence: is_within_geofence,
        attendance_status: 'PRESENT',
        approval_status: approvalStatus,
        distance_meters: distance_meters,
        admin_comment: adminComment
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({ success: false, message: 'Error processing kiosk check-in.' });
  }
});

/**
 * Prompt 6.1: Kiosk Check-Out
 */
router.post('/kiosk/check-out', (req, res) => {
  const userId = req.user.user_id;
  const { check_out_photo_url } = req.body;

  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const timeStr = now.toTimeString().substring(0, 8);

  const existing = db.prepare(`
    SELECT attendance_id FROM attendance
    WHERE user_id = ? AND attendance_date = ?
    ORDER BY attendance_id DESC LIMIT 1
  `).get(userId, todayStr);

  if (!existing) {
    return res.status(404).json({ success: false, message: 'No check-in record found for today.' });
  }

  db.prepare(`
    UPDATE attendance
    SET check_out_time = ?, check_out_photo_url = ?
    WHERE attendance_id = ?
  `).run(timeStr, check_out_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', existing.attendance_id);

  return res.status(200).json({
    success: true,
    message: 'Check-out recorded successfully.',
    data: {
      attendance_id: existing.attendance_id,
      check_out_time: timeStr
    }
  });
});

/**
 * Prompt 6.1: Personal Attendance History
 */
router.get('/my-logs', (req, res) => {
  const userId = req.user.user_id;
  const rows = db.prepare(`
    SELECT attendance_id, attendance_date, check_in_time, check_out_time,
           check_in_photo_url, check_out_photo_url, check_in_latitude, check_in_longitude,
           is_within_geofence, attendance_status, approval_status, admin_comment
    FROM attendance
    WHERE user_id = ?
    ORDER BY attendance_date DESC, attendance_id DESC
    LIMIT 30
  `).all(userId);

  const logs = rows.map(r => ({
    attendance_id: r.attendance_id,
    attendance_date: r.attendance_date,
    check_in_time: r.check_in_time,
    check_out_time: r.check_out_time,
    check_in_photo_url: r.check_in_photo_url,
    check_out_photo_url: r.check_out_photo_url,
    check_in_latitude: r.check_in_latitude,
    check_in_longitude: r.check_in_longitude,
    is_within_geofence: Boolean(r.is_within_geofence),
    attendance_status: r.attendance_status,
    approval_status: r.approval_status,
    admin_comment: r.admin_comment
  }));

  return res.status(200).json({ success: true, count: logs.length, logs });
});

/**
 * Prompt 6.3: Monthly Interactive Calendar Grid Endpoint
 */
router.get('/calendar', (req, res) => {
  const userId = req.user.user_id;
  const month = req.query.month || new Date().toISOString().substring(0, 7); // YYYY-MM

  // Fetch attendance records for this month
  const attRows = db.prepare(`
    SELECT attendance_id, attendance_date, check_in_time, check_out_time,
           attendance_status, approval_status, is_within_geofence
    FROM attendance
    WHERE user_id = ? AND strftime('%Y-%m', attendance_date) = ?
  `).all(userId, month);

  const attendanceByDate = {};
  attRows.forEach(r => {
    attendanceByDate[r.attendance_date] = {
      attendance_id: r.attendance_id,
      attendance_status: r.attendance_status,
      approval_status: r.approval_status,
      check_in_time: r.check_in_time,
      check_out_time: r.check_out_time,
      is_within_geofence: Boolean(r.is_within_geofence)
    };
  });

  // Fetch approved leaves
  const leaveRows = db.prepare(`
    SELECT leave_id, leave_type, start_date, end_date, leave_status
    FROM leave_requests
    WHERE user_id = ? AND leave_status = 'APPROVED'
  `).all(userId);

  const leavesByDate = {};
  leaveRows.forEach(l => {
    let curr = new Date(l.start_date);
    const end = new Date(l.end_date);

    while (curr <= end) {
      const dateStr = curr.toISOString().substring(0, 10);
      if (dateStr.startsWith(month)) {
        leavesByDate[dateStr] = {
          leave_id: l.leave_id,
          leave_type: l.leave_type,
          leave_status: l.leave_status
        };
      }
      curr.setDate(curr.getDate() + 1);
    }
  });

  return res.status(200).json({
    success: true,
    month,
    attendance_by_date: attendanceByDate,
    approved_leaves_by_date: leavesByDate
  });
});

/**
 * Prompt 6.2: Admin Flagged Attendance Review Queue
 */
router.get('/admin/flagged', requireRole('HR_ADMIN'), (req, res) => {
  const rows = db.prepare(`
    SELECT a.attendance_id, a.user_id, a.attendance_date, a.check_in_time, a.check_out_time,
           a.check_in_photo_url, a.check_in_latitude, a.check_in_longitude,
           a.is_within_geofence, a.attendance_status, a.approval_status, a.admin_comment,
           u.employee_id, u.first_name, u.last_name, u.department, u.job_title
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.approval_status = 'PENDING_ADMIN_APPROVAL'
    ORDER BY a.attendance_id DESC
  `).all();

  const flagged = rows.map(r => ({
    attendance_id: r.attendance_id,
    user_id: r.user_id,
    employee_id: r.employee_id,
    employee_name: `${r.first_name} ${r.last_name}`,
    department: r.department,
    job_title: r.job_title,
    attendance_date: r.attendance_date,
    check_in_time: r.check_in_time,
    check_in_photo_url: r.check_in_photo_url,
    check_in_latitude: r.check_in_latitude,
    check_in_longitude: r.check_in_longitude,
    is_within_geofence: Boolean(r.is_within_geofence),
    approval_status: r.approval_status,
    admin_comment: r.admin_comment,
    maps_url: `https://www.google.com/maps?q=${r.check_in_latitude},${r.check_in_longitude}`
  }));

  return res.status(200).json({ success: true, count: flagged.length, flagged_logs: flagged });
});

/**
 * Prompt 6.2: Admin Action on Flagged Attendance
 */
router.patch('/admin/verify/:attendance_id', requireRole('HR_ADMIN'), (req, res) => {
  const attId = parseInt(req.params.attendance_id, 10);
  const { approval_status, admin_comment } = req.body;

  if (!approval_status || !['APPROVED', 'REJECTED'].includes(approval_status)) {
    return res.status(400).json({ success: false, message: "approval_status must be 'APPROVED' or 'REJECTED'." });
  }

  const existing = db.prepare('SELECT attendance_id FROM attendance WHERE attendance_id = ?').get(attId);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Attendance record not found.' });
  }

  db.prepare(`
    UPDATE attendance
    SET approval_status = ?, admin_comment = ?, verified_by = ?
    WHERE attendance_id = ?
  `).run(approval_status, admin_comment || `Reviewed by HR Admin`, req.user.user_id, attId);

  return res.status(200).json({
    success: true,
    message: `Attendance log #${attId} status updated to ${approval_status}.`,
    data: { attendance_id: attId, approval_status }
  });
});

module.exports = router;
