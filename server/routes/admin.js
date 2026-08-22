const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Strict RBAC: All /admin/* routes require valid token and HR_ADMIN role
router.use(verifyToken);
router.use(requireRole('HR_ADMIN'));

/**
 * GET /api/admin/overview
 * HR Admin dashboard summary metrics
 */
router.get('/overview', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get().count;
    const pendingUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 0').get().count;
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'HR_ADMIN'").get().count;
    const employeeCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'EMPLOYEE'").get().count;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        pendingUsers,
        rolesBreakdown: {
          HR_ADMIN: adminCount,
          EMPLOYEE: employeeCount
        },
        adminUser: {
          employee_id: req.user.employee_id,
          email: req.user.email,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    console.error('Admin Overview Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin overview metrics.'
    });
  }
});

/**
 * GET /api/admin/employees
 * Lists all registered users/employees with their roles and verification status
 */
router.get('/employees', (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : '%';
    const roleFilter = req.query.role || null;

    let query = `
      SELECT id, employee_id, first_name, last_name, email, role, is_verified, verification_token, created_at, updated_at
      FROM users
      WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)
    `;
    const params = [search, search, search, search];

    if (roleFilter && ['HR_ADMIN', 'EMPLOYEE'].includes(roleFilter)) {
      query += ` AND role = ?`;
      params.push(roleFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const employees = db.prepare(query).all(...params);

    const sanitized = employees.map(emp => ({
      ...emp,
      is_verified: Boolean(emp.is_verified)
    }));

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      employees: sanitized
    });
  } catch (error) {
    console.error('Admin Employees Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee directory.'
    });
  }
});

/**
 * PATCH /api/admin/employees/:id/verify
 * Allows HR Admin to manually verify an employee's account
 */
router.patch('/employees/:id/verify', (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const user = db.prepare('SELECT id, email, is_verified FROM users WHERE id = ?').get(targetId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.'
      });
    }

    const newStatus = user.is_verified ? 0 : 1;
    db.prepare('UPDATE users SET is_verified = ?, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStatus, targetId);

    return res.status(200).json({
      success: true,
      message: `Employee (${user.email}) verification status set to ${newStatus ? 'VERIFIED' : 'UNVERIFIED'}.`,
      is_verified: Boolean(newStatus)
    });
  } catch (error) {
    console.error('Admin Verify Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update employee verification status.'
    });
  }
});

module.exports = router;
