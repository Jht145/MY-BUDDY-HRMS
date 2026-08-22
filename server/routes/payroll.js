const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all payroll routes
router.use(verifyToken);

/**
 * Prompt 8.1: Employee Payroll View
 * Read-only salary breakdown displaying salary_base, salary_allowances,
 * salary_deductions, and calculated net_salary.
 */
router.get('/my-payslips', (req, res) => {
  const userId = req.user.user_id;
  const rows = db.prepare(`
    SELECT p.payroll_id, p.user_id, p.salary_base, p.salary_allowances, p.salary_deductions,
           p.net_salary, p.updated_at,
           u.employee_id, u.first_name, u.last_name, u.department, u.job_title
    FROM payroll p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
    ORDER BY p.payroll_id DESC
  `).all(userId);

  const records = rows.map(r => ({
    payroll_id: r.payroll_id,
    user_id: r.user_id,
    employee_id: r.employee_id,
    employee_name: `${r.first_name} ${r.last_name}`,
    job_title: r.job_title,
    department: r.department,
    salary_base: Number(r.salary_base),
    salary_allowances: Number(r.salary_allowances),
    salary_deductions: Number(r.salary_deductions),
    net_salary: Number(r.net_salary),
    updated_at: r.updated_at
  }));

  return res.status(200).json({ success: true, count: records.length, payroll_records: records });
});

/**
 * Prompt 8.2: Admin Payroll Overview
 */
router.get('/admin/overview', requireRole('HR_ADMIN'), (req, res) => {
  const users = db.prepare(`
    SELECT u.id as user_id, u.employee_id, u.first_name, u.last_name, u.department, u.job_title,
           u.salary_base, u.salary_allowances, u.salary_deductions, u.net_salary,
           (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND a.attendance_status = 'PRESENT') as present_days,
           (SELECT COUNT(*) FROM leave_requests l WHERE l.user_id = u.id AND l.leave_status = 'APPROVED' AND l.leave_type = 'UNPAID') as unpaid_leave_days
    FROM users u
    ORDER BY u.id ASC
  `).all();

  let totalCost = 0.0;
  const payrollSheet = users.map(u => {
    const base = Number(u.salary_base || 5000.0);
    const allowances = Number(u.salary_allowances || Math.round(base * 0.1 * 100) / 100);
    const deductions = Number(u.salary_deductions || Math.round(base * 0.05 * 100) / 100);
    const net = Math.round((base + allowances - deductions) * 100) / 100;
    totalCost += net;

    return {
      user_id: u.user_id,
      employee_id: u.employee_id,
      employee_name: `${u.first_name} ${u.last_name}`,
      department: u.department,
      job_title: u.job_title,
      salary_base: base,
      salary_allowances: allowances,
      salary_deductions: deductions,
      net_salary: net,
      present_days: u.present_days,
      unpaid_leave_days: u.unpaid_leave_days
    };
  });

  return res.status(200).json({
    success: true,
    total_staff: payrollSheet.length,
    total_payroll_cost: totalCost,
    payroll_sheet: payrollSheet
  });
});

/**
 * Prompt 8.2: Admin Payroll Control (Editor)
 * Adjusts salary_base, salary_allowances, and salary_deductions, auto-calculates net_salary.
 */
router.put('/admin/adjust/:target_user_id', requireRole('HR_ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.target_user_id, 10);
  const target = db.prepare('SELECT id, email FROM users WHERE id = ?').get(targetUserId);

  if (!target) {
    return res.status(404).json({ success: false, message: 'Target employee not found.' });
  }

  const { salary_base, salary_allowances, salary_deductions } = req.body;

  if (salary_base === undefined) {
    return res.status(400).json({ success: false, message: 'salary_base is required.' });
  }

  const base = Number(salary_base);
  const allowances = salary_allowances !== undefined ? Number(salary_allowances) : 0.0;
  const deductions = salary_deductions !== undefined ? Number(salary_deductions) : 0.0;
  const net_salary = Math.round((base + allowances - deductions) * 100) / 100;

  db.prepare(`
    UPDATE users 
    SET salary_base = ?, salary_allowances = ?, salary_deductions = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(base, allowances, deductions, net_salary, targetUserId);

  const existing = db.prepare('SELECT payroll_id FROM payroll WHERE user_id = ?').get(targetUserId);
  if (existing) {
    db.prepare(`
      UPDATE payroll 
      SET salary_base = ?, salary_allowances = ?, salary_deductions = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(base, allowances, deductions, net_salary, targetUserId);
  } else {
    db.prepare(`
      INSERT INTO payroll (user_id, salary_base, salary_allowances, salary_deductions, net_salary)
      VALUES (?, ?, ?, ?, ?)
    `).run(targetUserId, base, allowances, deductions, net_salary);
  }

  return res.status(200).json({
    success: true,
    message: `Compensation adjusted for ${target.email}. Net salary auto-calculated to $${net_salary.toFixed(2)}.`,
    data: {
      user_id: targetUserId,
      salary_base: base,
      salary_allowances: allowances,
      salary_deductions: deductions,
      net_salary: net_salary
    }
  });
});

module.exports = router;
