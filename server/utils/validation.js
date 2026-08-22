const validator = require('validator');

/**
 * Validates password strength according to security standards:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numeric digit
 * - At least one special symbol
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required.',
      details: { minLength: false, uppercase: false, lowercase: false, number: false, specialChar: false }
    };
  }

  const minLength = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const isValid = minLength && uppercase && lowercase && number && specialChar;

  let message = '';
  if (!isValid) {
    const missing = [];
    if (!minLength) missing.push('at least 8 characters');
    if (!uppercase) missing.push('1 uppercase letter');
    if (!lowercase) missing.push('1 lowercase letter');
    if (!number) missing.push('1 number');
    if (!specialChar) missing.push('1 special character (e.g. !@#$%^&*)');
    message = `Password is too weak. It must contain: ${missing.join(', ')}.`;
  }

  return {
    isValid,
    message,
    details: { minLength, uppercase, lowercase, number, specialChar }
  };
}

/**
 * Validates email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email is required.' };
  }
  const cleanEmail = email.trim();
  if (!validator.isEmail(cleanEmail)) {
    return { isValid: false, message: 'Invalid email address format.' };
  }
  return { isValid: true, email: cleanEmail.toLowerCase() };
}

/**
 * Validates registration role
 */
function validateRole(role) {
  const allowedRoles = ['HR_ADMIN', 'EMPLOYEE'];
  if (!role || !allowedRoles.includes(role)) {
    return {
      isValid: false,
      message: `Invalid role. Role must be one of: ${allowedRoles.join(', ')}`
    };
  }
  return { isValid: true, role };
}

/**
 * Comprehensive registration payload validation
 */
function validateSignupInput(data) {
  const errors = {};

  if (!data.employee_id || !data.employee_id.toString().trim()) {
    errors.employee_id = 'Employee ID is required.';
  }

  if (!data.first_name || !data.first_name.toString().trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!data.last_name || !data.last_name.toString().trim()) {
    errors.last_name = 'Last name is required.';
  }

  const emailCheck = validateEmail(data.email);
  if (!emailCheck.isValid) {
    errors.email = emailCheck.message;
  }

  const passwordCheck = validatePassword(data.password);
  if (!passwordCheck.isValid) {
    errors.password = passwordCheck.message;
    errors.passwordDetails = passwordCheck.details;
  }

  const roleCheck = validateRole(data.role);
  if (!roleCheck.isValid) {
    errors.role = roleCheck.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      employee_id: data.employee_id ? data.employee_id.toString().trim() : '',
      first_name: data.first_name ? data.first_name.toString().trim() : '',
      last_name: data.last_name ? data.last_name.toString().trim() : '',
      email: emailCheck.email || '',
      role: roleCheck.role || 'EMPLOYEE'
    }
  };
}

module.exports = {
  validatePassword,
  validateEmail,
  validateRole,
  validateSignupInput
};
