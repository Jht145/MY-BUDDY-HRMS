const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all profile routes
router.use(verifyToken);

/**
 * Prompt 5.1: Employee Profile View Component
 * Renders complete profile fields including documents_url, salary_base, net_salary
 */
router.get('/', (req, res) => {
  const userId = req.user.user_id;
  const u = db.prepare(`
    SELECT id, employee_id, first_name, last_name, email, role, phone, address,
           profile_picture_url, job_title, department, joining_date, documents_url,
           salary_base, salary_allowances, salary_deductions, net_salary,
           leave_balance_paid, leave_balance_sick, is_email_verified, created_at
    FROM users WHERE id = ?
  `).get(userId);

  if (!u) {
    return res.status(404).json({ success: false, message: 'Profile not found.' });
  }

  return res.status(200).json({
    success: true,
    profile: {
      user_id: u.id,
      id: u.id,
      employee_id: u.employee_id,
      first_name: u.first_name,
      last_name: u.last_name,
      full_name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      role: u.role,
      phone: u.phone || 'Not provided',
      address: u.address || 'Not provided',
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
      is_email_verified: Boolean(u.is_email_verified),
      created_at: u.created_at
    }
  });
});

/**
 * Prompt 5.2: Role-Based Field Security - Employee Self-Service Update
 * Employees are strictly limited to updating phone, address, and profile_picture_url.
 */
router.patch('/self', (req, res) => {
  const userId = req.user.user_id;
  const { phone, address, profile_picture_url } = req.body;

  const updates = [];
  const params = [];

  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone ? phone.trim() : null);
  }
  if (address !== undefined) {
    updates.push('address = ?');
    params.push(address ? address.trim() : null);
  }
  if (profile_picture_url !== undefined) {
    updates.push('profile_picture_url = ?');
    params.push(profile_picture_url ? profile_picture_url.trim() : null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid self-editable fields provided (phone, address, profile_picture_url).' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return res.status(200).json({
    success: true,
    message: 'Profile contact information updated successfully.'
  });
});

/**
 * Prompt 5.2: Role-Based Field Security - Admin Comprehensive Modification Rights
 * HR Administrators have write permissions across organizational, document, and compensation fields.
 */
router.patch('/admin/:target_user_id', requireRole('HR_ADMIN'), (req, res) => {
  const targetUserId = parseInt(req.params.target_user_id, 10);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);

  if (!target) {
    return res.status(404).json({ success: false, message: 'Target employee not found.' });
  }

  const {
    job_title,
    department,
    documents_url,
    salary_base,
    salary_allowances,
    salary_deductions,
    phone,
    address
  } = req.body;

  const updates = [];
  const params = [];

  if (job_title !== undefined) { updates.push('job_title = ?'); params.push(job_title.trim()); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department.trim()); }
  if (documents_url !== undefined) { updates.push('documents_url = ?'); params.push(documents_url.trim()); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone.trim()); }
  if (address !== undefined) { updates.push('address = ?'); params.push(address.trim()); }

  // Salary adjustments & net_salary recalculation
  let newBase = salary_base !== undefined ? Number(salary_base) : Number(target.salary_base || 5000.0);
  let newAllowances = salary_allowances !== undefined ? Number(salary_allowances) : Number(target.salary_allowances || 500.0);
  let newDeductions = salary_deductions !== undefined ? Number(salary_deductions) : Number(target.salary_deductions || 250.0);

  if (salary_base !== undefined || salary_allowances !== undefined || salary_deductions !== undefined) {
    const computedNet = Math.round((newBase + newAllowances - newDeductions) * 100) / 100;
    updates.push('salary_base = ?', 'salary_allowances = ?', 'salary_deductions = ?', 'net_salary = ?');
    params.push(newBase, newAllowances, newDeductions, computedNet);

    // Sync to payroll table
    const existingPayroll = db.prepare('SELECT payroll_id FROM payroll WHERE user_id = ?').get(targetUserId);
    if (existingPayroll) {
      db.prepare(`
        UPDATE payroll 
        SET salary_base = ?, salary_allowances = ?, salary_deductions = ?, net_salary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(newBase, newAllowances, newDeductions, computedNet, targetUserId);
    } else {
      db.prepare(`
        INSERT INTO payroll (user_id, salary_base, salary_allowances, salary_deductions, net_salary)
        VALUES (?, ?, ?, ?, ?)
      `).run(targetUserId, newBase, newAllowances, newDeductions, computedNet);
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(targetUserId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);

  return res.status(200).json({
    success: true,
    message: `Profile and records for employee ${target.email} updated by HR Admin.`,
    data: {
      user_id: updatedUser.id,
      job_title: updatedUser.job_title,
      department: updatedUser.department,
      documents_url: updatedUser.documents_url,
      salary_base: Number(updatedUser.salary_base),
      salary_allowances: Number(updatedUser.salary_allowances),
      salary_deductions: Number(updatedUser.salary_deductions),
      net_salary: Number(updatedUser.net_salary)
    }
  });
});

module.exports = router;
