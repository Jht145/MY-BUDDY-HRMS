const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { validateSignupInput, validatePassword, validateEmail } = require('../utils/validation');
const { verifyToken, JWT_SECRET, MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES } = require('../middleware/auth');

const router = express.Router();

/**
 * Prompt 2.1: Secure Registration Endpoint (/signup)
 * Captures employee_id, first_name, last_name, email, password, role.
 * Sets is_email_verified = false (0) and generates a verification token.
 */
router.post('/signup', (req, res) => {
  try {
    const { employee_id, first_name, last_name, email, password, role } = req.body;

    const validation = validateSignupInput({ employee_id, first_name, last_name, email, password, role });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please correct input errors.',
        errors: validation.errors
      });
    }

    const { sanitized } = validation;

    // Check unique employee_id and email
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(sanitized.email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const existingEmpId = db.prepare('SELECT id FROM users WHERE employee_id = ?').get(sanitized.employee_id);
    if (existingEmpId) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID is already registered in the system.'
      });
    }

    // Hash password with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const verification_token = crypto.randomBytes(32).toString('hex');

    const stmt = db.prepare(`
      INSERT INTO users (
        employee_id, first_name, last_name, email, password_hash, role,
        is_email_verified, verification_token,
        salary_base, salary_allowances, salary_deductions, net_salary
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 5000.00, 500.00, 250.00, 5250.00)
    `);

    const info = stmt.run(
      sanitized.employee_id,
      sanitized.first_name,
      sanitized.last_name,
      sanitized.email,
      password_hash,
      sanitized.role,
      verification_token
    );

    const userId = info.lastInsertRowid;

    // Seed corresponding payroll entry
    db.prepare(`
      INSERT INTO payroll (user_id, salary_base, salary_allowances, salary_deductions, net_salary)
      VALUES (?, 5000.00, 500.00, 250.00, 5250.00)
    `).run(userId);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please verify your email before logging in.',
      data: {
        user_id: userId,
        employee_id: sanitized.employee_id,
        first_name: sanitized.first_name,
        last_name: sanitized.last_name,
        email: sanitized.email,
        role: sanitized.role,
        is_email_verified: false,
        verification_token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

/**
 * Prompt 2.2: Email Verification Endpoints
 */
router.get('/verify-email', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required as a query parameter.' });
  }

  const user = db.prepare('SELECT id, email, is_email_verified FROM users WHERE verification_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
  }

  db.prepare('UPDATE users SET is_email_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return res.status(200).json({
    success: true,
    message: `Email address ${user.email} verified successfully. You may now sign in.`
  });
});

router.post('/verify-email', (req, res) => {
  const token = req.body.token || req.query.token;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Verification token is required.' });
  }

  const user = db.prepare('SELECT id, email, is_email_verified FROM users WHERE verification_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
  }

  db.prepare('UPDATE users SET is_email_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return res.status(200).json({
    success: true,
    message: `Email address ${user.email} verified successfully. You may now sign in.`
  });
});

/**
 * Prompt 2.3: Secure Sign In Endpoint (/login)
 * Validates credentials, checks 3-trials lockout policy, enforces is_email_verified,
 * and issues session JWT containing user_id and role.
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(cleanEmail);

    const now = new Date();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials.' });
    }

    // 1. Check account lockout
    if (user.locked_until) {
      const lockedTime = new Date(user.locked_until);
      if (lockedTime > now) {
        const minsLeft = Math.max(1, Math.ceil((lockedTime.getTime() - now.getTime()) / (1000 * 60)));
        return res.status(423).json({
          success: false,
          is_locked: true,
          locked_until: user.locked_until,
          message: `Account is temporarily locked due to 3 consecutive failed login attempts. Try again in ${minsLeft} minute(s) or contact HR Admin.`
        });
      }
    }

    // 2. Verify password credentials
    const isMatch = bcrypt.compareSync(password, user.password_hash);

    if (!isMatch) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
        db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newAttempts, lockUntil, user.id);

        return res.status(423).json({
          success: false,
          is_locked: true,
          locked_until: lockUntil,
          message: `Account has been locked for ${LOCKOUT_MINUTES} minutes following ${MAX_LOGIN_ATTEMPTS} failed attempts.`
        });
      } else {
        db.prepare('UPDATE users SET failed_login_attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newAttempts, user.id);
        const trialsRemaining = MAX_LOGIN_ATTEMPTS - newAttempts;

        return res.status(401).json({
          success: false,
          trials_remaining: trialsRemaining,
          message: `Invalid email or password credentials. ${trialsRemaining} trial(s) remaining before account lockout.`
        });
      }
    }

    // 3. Check is_email_verified
    if (!user.is_email_verified) {
      return res.status(403).json({
        success: false,
        is_email_verified: false,
        verification_token: user.verification_token,
        message: 'Email address is unverified. Please verify your email before logging in.'
      });
    }

    // 4. Reset failed attempts & update last_activity
    const nowIso = now.toISOString();
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_activity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(nowIso, user.id);

    // 5. Generate signed JWT token
    const tokenPayload = {
      user_id: user.id,
      id: user.id,
      employee_id: user.employee_id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        user_id: user.id,
        id: user.id,
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_email_verified: true
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

/**
 * Get current authenticated user profile
 */
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, employee_id, first_name, last_name, email, role, phone, address,
           profile_picture_url, job_title, department, joining_date, documents_url,
           salary_base, salary_allowances, salary_deductions, net_salary,
           leave_balance_paid, leave_balance_sick, is_email_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user.user_id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.status(200).json({
    success: true,
    user: {
      ...user,
      user_id: user.id,
      full_name: `${user.first_name} ${user.last_name}`,
      is_email_verified: Boolean(user.is_email_verified)
    }
  });
});

module.exports = router;
