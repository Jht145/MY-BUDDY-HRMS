const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'mybuddy_hrms_super_secret_jwt_key_2026_secure';
const INACTIVITY_TIMEOUT_SECONDS = 120; // 2 minutes
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

/**
 * Middleware to verify JWT token from Authorization header (Bearer <token>)
 * and enforce 2-minute server-side inactivity session expiration.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Malformed token. Format: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.user_id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload structure.'
      });
    }

    // Check server-side 2-minute inactivity against database
    const user = db.prepare('SELECT id, last_activity, role, is_email_verified FROM users WHERE id = ?').get(decoded.user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User session no longer exists.'
      });
    }

    if (user.last_activity) {
      const lastAct = new Date(user.last_activity).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = (now - lastAct) / 1000;

      if (elapsedSeconds > INACTIVITY_TIMEOUT_SECONDS) {
        return res.status(401).json({
          success: false,
          inactivity_logout: true,
          message: 'Session expired due to 2 minutes of inactivity. Please log in again.'
        });
      }
    }

    // Update last_activity to current UTC timestamp
    const nowIso = new Date().toISOString();
    db.prepare('UPDATE users SET last_activity = ? WHERE id = ?').run(nowIso, user.id);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
}

/**
 * Role-based access control middleware
 * Example: requireRole('HR_ADMIN') or requireRole(['HR_ADMIN', 'EMPLOYEE'])
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking role permissions.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access is restricted to [${roles.join(', ')}]. Your current role is [${req.user.role}].`,
        requiredRole: roles,
        userRole: req.user.role
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
  JWT_SECRET,
  INACTIVITY_TIMEOUT_SECONDS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES
};
