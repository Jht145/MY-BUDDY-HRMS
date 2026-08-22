const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { validateSignupInput, validateEmail } = require('../utils/validation');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/signup & /signup
 * Accepts: employee_id, first_name, last_name, email, password, role
 */
router.post('/signup', (req, res) => {
  try {
    const validation = validateSignupInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Registration validation failed.',
        errors: validation.errors
      });
    }

    const { employee_id, first_name, last_name, email, role } = validation.sanitized;
    const { password } = req.body;

    // Duplicate email check
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        field: 'email'
      });
    }

    // Duplicate employee_id check
    const existingEmpId = db.prepare('SELECT id FROM users WHERE employee_id = ?').get(employee_id);
    if (existingEmpId) {
      return res.status(409).json({
        success: false,
        message: `Employee ID "${employee_id}" is already registered.`,
        field: 'employee_id'
      });
    }

    // Hash password with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    // Generate email verification token
    const verification_token = crypto.randomBytes(32).toString('hex');
    const is_verified = 0; // Unverified upon signup

    // Insert user into SQLite database
    const insertStmt = db.prepare(`
      INSERT INTO users (employee_id, first_name, last_name, email, password_hash, role, is_verified, verification_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      employee_id,
      first_name,
      last_name,
      email,
      password_hash,
      role,
      is_verified,
      verification_token
    );

    return res.status(201).json({
      success: true,
      message: 'User registration successful! Please verify your email to activate your account.',
      data: {
        user_id: result.lastInsertRowid,
        employee_id,
        first_name,
        last_name,
        email,
        role,
        is_verified: false,
        verification_token // Provided in response for easy testing / simulator
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
});

/**
 * POST /api/auth/login & /login
 * Accepts: email, password
 * Returns: JWT session token containing user_id and role
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.'
      });
    }

    // Find user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailCheck.email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Compare password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Server-side check for email verification status
    if (user.is_verified === 0) {
      return res.status(403).json({
        success: false,
        is_verified: false,
        message: 'Account email has not been verified. Please complete email verification before logging in.',
        email: user.email,
        verification_token: user.verification_token
      });
    }

    // Generate JWT token containing user_id, employee_id, and role
    const payload = {
      user_id: user.id,
      employee_id: user.employee_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        user_id: user.id,
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_verified: Boolean(user.is_verified)
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Accepts: token (or email for testing)
 */
router.post('/verify-email', (req, res) => {
  try {
    const { token, email } = req.body;

    let user;
    if (token) {
      user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
    } else if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.'
      });
    }

    // Mark user as verified and clear token
    db.prepare(`
      UPDATE users 
      SET is_verified = 1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(user.id);

    return res.status(200).json({
      success: true,
      message: `Email verified successfully for ${user.email}. You may now log in.`,
      email: user.email
    });
  } catch (error) {
    console.error('Verify Email Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during email verification.'
    });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current user profile
 */
router.get('/me', verifyToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, employee_id, first_name, last_name, email, role, is_verified, created_at FROM users WHERE id = ?').get(req.user.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        is_verified: Boolean(user.is_verified)
      }
    });
  } catch (error) {
    console.error('Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving user profile.'
    });
  }
});

module.exports = router;
