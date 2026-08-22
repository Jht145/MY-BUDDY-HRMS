process.env.NODE_ENV = 'test';
process.env.PORT = 5055;
process.env.JWT_SECRET = 'test_secret_key_12345';

const http = require('http');
const app = require('../server/index');

let server;
const BASE_URL = `http://localhost:${process.env.PORT}`;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('\n=========================================');
  console.log('🧪 RUNNING MY-BUDDY-HRMS AUTH TEST SUITE');
  console.log('=========================================\n');

  server = app.listen(process.env.PORT);

  try {
    // 1. Health check
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200, 'Health check returns 200 OK');

    // 2. Signup - Missing fields validation
    const emptySignup = await makeRequest('POST', '/signup', {});
    assert(emptySignup.status === 400, 'Signup with missing fields returns 400 Bad Request');
    assert(emptySignup.body.errors.email !== undefined, 'Signup identifies missing email');
    assert(emptySignup.body.errors.password !== undefined, 'Signup identifies missing password');

    // 3. Signup - Password Strength Validation
    const weakPass1 = await makeRequest('POST', '/signup', {
      employee_id: 'EMP-T1',
      first_name: 'Test',
      last_name: 'User',
      email: 'weak1@test.com',
      password: 'password123', // Missing uppercase & special character
      role: 'EMPLOYEE'
    });
    assert(weakPass1.status === 400, 'Signup rejects password without uppercase & special char');

    const weakPass2 = await makeRequest('POST', '/signup', {
      employee_id: 'EMP-T2',
      first_name: 'Test',
      last_name: 'User',
      email: 'weak2@test.com',
      password: 'Short1!', // Less than 8 characters
      role: 'EMPLOYEE'
    });
    assert(weakPass2.status === 400, 'Signup rejects password shorter than 8 chars');

    // 4. Signup - Successful registration with strong password
    const testEmployeeId = `EMP-TEST-${Date.now()}`;
    const testEmail = `employee.${Date.now()}@mybuddyhrms.com`;
    const strongPassword = 'SecurePassword@2026!';

    const validSignup = await makeRequest('POST', '/signup', {
      employee_id: testEmployeeId,
      first_name: 'Alex',
      last_name: 'Rivera',
      email: testEmail,
      password: strongPassword,
      role: 'EMPLOYEE'
    });
    assert(validSignup.status === 201, 'Signup succeeds with valid inputs & strong password (201 Created)');
    assert(validSignup.body.data.is_verified === false, 'New user is initially unverified');
    assert(typeof validSignup.body.data.verification_token === 'string', 'Verification token is generated');

    const verificationToken = validSignup.body.data.verification_token;

    // 5. Signup - Duplicate Email Check
    const dupEmailSignup = await makeRequest('POST', '/signup', {
      employee_id: `EMP-DIFF-${Date.now()}`,
      first_name: 'Another',
      last_name: 'User',
      email: testEmail, // Duplicate
      password: strongPassword,
      role: 'EMPLOYEE'
    });
    assert(dupEmailSignup.status === 409, 'Signup detects duplicate email and returns 409 Conflict');

    // 6. Signup - Duplicate Employee ID Check
    const dupIdSignup = await makeRequest('POST', '/signup', {
      employee_id: testEmployeeId, // Duplicate
      first_name: 'Another',
      last_name: 'User',
      email: `another.${Date.now()}@test.com`,
      password: strongPassword,
      role: 'EMPLOYEE'
    });
    assert(dupIdSignup.status === 409, 'Signup detects duplicate employee_id and returns 409 Conflict');

    // 7. Login - Unverified Account Check
    const unverifiedLogin = await makeRequest('POST', '/login', {
      email: testEmail,
      password: strongPassword
    });
    assert(unverifiedLogin.status === 403, 'Login blocked for unverified email (403 Forbidden)');
    assert(unverifiedLogin.body.is_verified === false, 'Login response flags is_verified: false');

    // 8. Email Verification - Invalid token
    const invalidVerify = await makeRequest('POST', '/verify-email', {
      token: 'completely_fake_token_123'
    });
    assert(invalidVerify.status === 400, 'Verify email rejects invalid token (400 Bad Request)');

    // 9. Email Verification - Valid token
    const validVerify = await makeRequest('POST', '/verify-email', {
      token: verificationToken
    });
    assert(validVerify.status === 200, 'Verify email activates account with valid token (200 OK)');

    // 10. Login - Successful login for verified user
    const loginSuccess = await makeRequest('POST', '/login', {
      email: testEmail,
      password: strongPassword
    });
    assert(loginSuccess.status === 200, 'Login succeeds for verified user (200 OK)');
    assert(typeof loginSuccess.body.token === 'string', 'Login returns valid JWT string');
    assert(loginSuccess.body.user.role === 'EMPLOYEE', 'User role in response is EMPLOYEE');
    assert(loginSuccess.body.user.user_id !== undefined, 'User payload contains user_id');

    const employeeToken = loginSuccess.body.token;

    // 11. Login as seeded Admin
    const adminLogin = await makeRequest('POST', '/login', {
      email: 'admin@mybuddyhrms.com',
      password: 'Admin@12345'
    });
    assert(adminLogin.status === 200, 'Admin login succeeds with seeded credentials');
    assert(adminLogin.body.user.role === 'HR_ADMIN', 'Admin user has HR_ADMIN role');

    const adminToken = adminLogin.body.token;

    // 12. Role Middleware - Unauthenticated request to /admin/*
    const unauthAdmin = await makeRequest('GET', '/api/admin/overview');
    assert(unauthAdmin.status === 401, 'Unauthenticated request to /admin/* returns 401 Unauthorized');

    // 13. Role Middleware - EMPLOYEE trying to access /admin/* routes
    const forbiddenAdmin = await makeRequest('GET', '/api/admin/overview', null, employeeToken);
    assert(forbiddenAdmin.status === 403, 'EMPLOYEE access to /admin/* is blocked (403 Forbidden)');

    // 14. Role Middleware - HR_ADMIN accessing /admin/* routes
    const allowedAdmin = await makeRequest('GET', '/api/admin/overview', null, adminToken);
    assert(allowedAdmin.status === 200, 'HR_ADMIN successfully accesses /api/admin/overview (200 OK)');
    assert(allowedAdmin.body.data.totalUsers >= 2, 'Admin overview contains aggregate statistics');

    // 15. Admin Employee Directory
    const adminEmployees = await makeRequest('GET', '/api/admin/employees', null, adminToken);
    assert(adminEmployees.status === 200, 'HR_ADMIN can retrieve employee directory');
    assert(Array.isArray(adminEmployees.body.employees), 'Employee directory returns list of employees');

    // 16. Employee Dashboard - User-scoped access
    const empDashboard = await makeRequest('GET', '/api/employee/dashboard', null, employeeToken);
    assert(empDashboard.status === 200, 'EMPLOYEE successfully accesses user-scoped dashboard (200 OK)');
    assert(empDashboard.body.data.profile.email === testEmail, 'Dashboard data is strictly scoped to the employee');

    console.log('\n=========================================');
    console.log('🎉 ALL AUTH & RBAC TESTS PASSED SUCCESSFULLY!');
    console.log('=========================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
