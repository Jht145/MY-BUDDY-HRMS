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
  console.log('\n========================================================================');
  console.log('🧪 RUNNING NODE.JS DAYFLOW HRMS TEST SUITE (8 PROMPTS & EXACT FIELD DICT)');
  console.log('========================================================================\n');

  server = app.listen(process.env.PORT);

  try {
    // 1. Health check
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200, 'Health check returns 200 OK');

    // 2. Prompt 2: Registration (/signup with exact keys)
    const testEmployeeId = `EMP-NODE-${Date.now()}`;
    const testEmail = `employee.node.${Date.now()}@mybuddyhrms.com`;
    const strongPassword = 'SecurePassword@2026!';

    const validSignup = await makeRequest('POST', '/signup', {
      employee_id: testEmployeeId,
      first_name: 'Alex',
      last_name: 'Rivera',
      email: testEmail,
      password: strongPassword,
      role: 'EMPLOYEE'
    });
    assert(validSignup.status === 201, 'Prompt 2: /signup created account successfully (201 Created)');
    assert(validSignup.body.data.is_email_verified === false, 'Prompt 2: is_email_verified is initially false');
    assert(typeof validSignup.body.data.verification_token === 'string', 'Prompt 2: verification_token generated');

    const verificationToken = validSignup.body.data.verification_token;
    const userId = validSignup.body.data.user_id;

    // 3. Prompt 2: Login blocked for unverified email
    const unverifiedLogin = await makeRequest('POST', '/login', { email: testEmail, password: strongPassword });
    assert(unverifiedLogin.status === 403, 'Prompt 2: Login blocked for unverified email (403 Forbidden)');
    assert(unverifiedLogin.body.is_email_verified === false, 'Prompt 2: Response explicitly flags is_email_verified = false');

    // 4. Prompt 2: Email Verification
    const validVerify = await makeRequest('GET', `/verify-email?token=${verificationToken}`);
    assert(validVerify.status === 200, 'Prompt 2: /verify-email?token=... sets is_email_verified = true (200 OK)');

    // 5. Prompt 2: Login after verification returns JWT
    const loginSuccess = await makeRequest('POST', '/login', { email: testEmail, password: strongPassword });
    assert(loginSuccess.status === 200, 'Prompt 2: /login returns JWT session with user_id and role');
    assert(typeof loginSuccess.body.token === 'string', 'JWT token issued');
    assert(loginSuccess.body.user.role === 'EMPLOYEE', 'User role is EMPLOYEE');

    const employeeToken = loginSuccess.body.token;

    // 6. Admin Login
    const adminLogin = await makeRequest('POST', '/login', { email: 'admin@mybuddyhrms.com', password: 'Admin@12345' });
    assert(adminLogin.status === 200, 'Admin login succeeds');
    const adminToken = adminLogin.body.token;

    // 7. Prompt 4.1: Employee Dashboard & Announcements
    const empDashboard = await makeRequest('GET', '/api/employee/dashboard', null, employeeToken);
    assert(empDashboard.status === 200, 'Prompt 4.1: Employee Dashboard loaded');
    assert(Array.isArray(empDashboard.body.data.announcements), 'Prompt 4.1: Announcements feed included');
    assert(empDashboard.body.data.profile.email === testEmail, 'Prompt 4.1: Profile strictly scoped to user');

    // 8. Prompt 4.2: Admin Context Switcher Tool
    const contextView = await makeRequest('GET', `/api/admin/employees/${userId}/context-view`, null, adminToken);
    assert(contextView.status === 200, 'Prompt 4.2: Admin Context Switcher loaded member view');
    assert(contextView.body.context_user.email === testEmail, 'Prompt 4.2: Context user matches target employee');

    // 9. Prompt 5: Profile Management & Role-Based Field Security
    const profileRes = await makeRequest('GET', '/api/v1/profile', null, employeeToken);
    assert(profileRes.status === 200, 'Prompt 5.1: Profile View Component retrieved');
    assert(profileRes.body.profile.documents_url !== undefined, 'Prompt 5.1: documents_url field present');
    assert(profileRes.body.profile.salary_base !== undefined, 'Prompt 5.1: salary_base present');

    // Employee self-update
    const selfUpdate = await makeRequest('PATCH', '/api/v1/profile/self', { phone: '+1 (555) 333-4444' }, employeeToken);
    assert(selfUpdate.status === 200, 'Prompt 5.2: Employee self-service updated phone');

    // Admin update organizational & compensation fields
    const adminProfUpdate = await makeRequest('PATCH', `/api/v1/profile/admin/${userId}`, {
      job_title: 'Staff Platform Engineer',
      department: 'Infrastructure',
      salary_base: 7500.00,
      salary_allowances: 750.00,
      salary_deductions: 375.00
    }, adminToken);
    assert(adminProfUpdate.status === 200, 'Prompt 5.2: HR Admin updated organizational and compensation fields');
    assert(adminProfUpdate.body.data.net_salary === 7875.00, 'Prompt 5.2: net_salary auto-computed to $7,875.00');

    // 10. Prompt 6: Smart Kiosk Attendance & Geofencing
    // Office check-in
    const checkinOffice = await makeRequest('POST', '/api/v1/attendance/kiosk/check-in', {
      check_in_photo_url: 'https://img.com/snap.jpg',
      check_in_latitude: 12.9716,
      check_in_longitude: 77.5946
    }, employeeToken);
    assert(checkinOffice.status === 200, 'Prompt 6.1: Kiosk check-in succeeded');
    assert(checkinOffice.body.data.is_within_geofence === true, 'Prompt 6.2: is_within_geofence = true within 100m');
    assert(checkinOffice.body.data.approval_status === 'AUTO_APPROVED', 'Prompt 6.2: approval_status = AUTO_APPROVED');

    // Kiosk check-out
    const checkout = await makeRequest('POST', '/api/v1/attendance/kiosk/check-out', {
      check_out_photo_url: 'https://img.com/checkout.jpg'
    }, employeeToken);
    assert(checkout.status === 200, 'Prompt 6.1: Kiosk check-out recorded');

    // Monthly calendar
    const calRes = await makeRequest('GET', '/api/v1/attendance/calendar', null, employeeToken);
    assert(calRes.status === 200, 'Prompt 6.3: Monthly interactive calendar grid returned');
    assert(calRes.body.attendance_by_date !== undefined, 'Prompt 6.3: Daily attendance map present');

    // 11. Prompt 7: Leave Management
    const leaveApply = await makeRequest('POST', '/api/v1/leaves/apply', {
      leave_type: 'PAID',
      start_date: '2026-09-20',
      end_date: '2026-09-22',
      leave_reason: 'Attending cloud summit'
    }, employeeToken);
    assert(leaveApply.status === 200, 'Prompt 7.1: Leave application submitted');
    const leaveId = leaveApply.body.data.leave_id;

    // Admin approve leave
    const leaveAction = await makeRequest('PATCH', `/api/v1/leaves/admin/action/${leaveId}`, {
      leave_status: 'APPROVED',
      admin_comment: 'Approved by Director'
    }, adminToken);
    assert(leaveAction.status === 200, 'Prompt 7.2: Admin approved leave request');

    // 12. Prompt 8: Payroll Management
    const myPayslips = await makeRequest('GET', '/api/v1/payroll/my-payslips', null, employeeToken);
    assert(myPayslips.status === 200, 'Prompt 8.1: Employee retrieved payslip breakdown');

    // Admin adjust salary
    const adjSalary = await makeRequest('PUT', `/api/v1/payroll/admin/adjust/${userId}`, {
      salary_base: 8500.00,
      salary_allowances: 850.00,
      salary_deductions: 425.00
    }, adminToken);
    assert(adjSalary.status === 200, 'Prompt 8.2: Admin adjusted compensation');
    assert(adjSalary.body.data.net_salary === 8925.00, 'Prompt 8.2: net_salary auto-calculated to $8,925.00');

    // Non-admin blocked from adjust
    const blockedAdj = await makeRequest('PUT', `/api/v1/payroll/admin/adjust/${userId}`, {
      salary_base: 10000.00
    }, employeeToken);
    assert(blockedAdj.status === 403, 'Prompt 8.2: Non-admin users strictly blocked from payload modification (403 Forbidden)');

    console.log('\n========================================================================');
    console.log('🎉 ALL NODE.JS 8 TASK PROMPTS AND DATA DICTIONARY TESTS PASSED 100%!');
    console.log('========================================================================\n');
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
