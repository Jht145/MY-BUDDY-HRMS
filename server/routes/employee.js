const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Strict user-scoped authentication: All /employee/* routes require valid token
router.use(verifyToken);

/**
 * GET /api/employee/dashboard
 * Returns strictly user-scoped dashboard data for the authenticated employee
 */
router.get('/dashboard', (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = db.prepare(`
      SELECT id, employee_id, first_name, last_name, email, role, is_verified, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.'
      });
    }

    // User-scoped mock HRMS data (attendance, leave balances, recent payroll)
    const userDashboardData = {
      profile: {
        ...user,
        is_verified: Boolean(user.is_verified)
      },
      leaveBalance: {
        annual: 14,
        sick: 7,
        casual: 3,
        used: 4
      },
      attendanceSummary: {
        presentDays: 21,
        totalWorkingDays: 22,
        checkInTime: '09:05 AM',
        status: 'Active (On Duty)'
      },
      recentPayslip: {
        month: 'August 2026',
        netPay: '$4,850.00',
        status: 'Processed'
      },
      securityContext: {
        role: req.user.role,
        scope: 'USER_RESTRICTED',
        adminAccessGranted: false
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Employee dashboard loaded securely.',
      data: userDashboardData
    });
  } catch (error) {
    console.error('Employee Dashboard Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee dashboard data.'
    });
  }
});

module.exports = router;
