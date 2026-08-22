/**
 * My Buddy HRMS Client Application
 * Full-Stack Core HR Operations & Smart Kiosk Attendance
 */

const API_BASE = '';
const INACTIVITY_LIMIT_SECONDS = 120; // 2 minutes
const INACTIVITY_WARNING_SECONDS = 105;

// Office HQ Coordinates
const OFFICE_LAT = 12.9716;
const OFFICE_LON = 77.5946;

// Application State
const state = {
  token: localStorage.getItem('hrms_token') || null,
  user: JSON.parse(localStorage.getItem('hrms_user') || 'null'),
  currentView: 'auth',
  authTab: 'login',
  idleSeconds: 0,
  idleInterval: null,
  rateLimitRemaining: 6,
  kioskLat: OFFICE_LAT,
  kioskLon: OFFICE_LON,
  kioskPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
};

// ==========================================
// API CLIENT
// ==========================================

async function apiRequest(endpoint, method = 'GET', data = null, token = state.token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);

    const remaining = res.headers.get('X-RateLimit-Remaining');
    if (remaining !== null) {
      updateRateLimitUI(parseInt(remaining, 10));
    }

    const result = await res.json();

    if (res.status === 401 && result.inactivity_logout) {
      handleInactivityLogout('Session expired: Logged out due to 2 minutes of server-detected inactivity.');
      return { status: res.status, ok: false, data: result };
    }

    return { status: res.status, ok: res.ok, data: result };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      data: { success: false, message: 'Network error. Is the server running?' }
    };
  }
}

function updateRateLimitUI(remaining) {
  state.rateLimitRemaining = remaining;
  const el = document.getElementById('rate-remaining');
  if (el) el.textContent = remaining;
  const pill = document.getElementById('rate-limit-pill');
  if (pill) {
    if (remaining <= 1) pill.classList.add('low');
    else pill.classList.remove('low');
  }
}

function showAlert(element, message, type = 'danger') {
  if (!element) return;
  element.className = `alert alert-${type} show`;
  element.innerHTML = message;
}

function hideAlert(element) {
  if (!element) return;
  element.className = 'alert';
  element.innerHTML = '';
}

// ==========================================
// 2-MINUTE INACTIVITY WATCHDOG
// ==========================================

function startInactivityWatchdog() {
  stopInactivityWatchdog();
  state.idleSeconds = 0;

  state.idleInterval = setInterval(() => {
    if (!state.token) return;

    state.idleSeconds++;
    updateIdleTimerDisplay();

    const warningBar = document.getElementById('inactivity-warning-bar');
    const countdown = document.getElementById('inactivity-countdown');

    if (state.idleSeconds >= INACTIVITY_WARNING_SECONDS && state.idleSeconds < INACTIVITY_LIMIT_SECONDS) {
      if (warningBar) warningBar.style.display = 'block';
      if (countdown) countdown.textContent = INACTIVITY_LIMIT_SECONDS - state.idleSeconds;
    } else if (state.idleSeconds >= INACTIVITY_LIMIT_SECONDS) {
      handleInactivityLogout('Logged out automatically due to 2 minutes of inactivity.');
    } else {
      if (warningBar) warningBar.style.display = 'none';
    }
  }, 1000);

  const resetActivity = () => {
    state.idleSeconds = 0;
    const warningBar = document.getElementById('inactivity-warning-bar');
    if (warningBar) warningBar.style.display = 'none';
    updateIdleTimerDisplay();
  };

  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetActivity, { passive: true });
  });
}

function stopInactivityWatchdog() {
  if (state.idleInterval) {
    clearInterval(state.idleInterval);
    state.idleInterval = null;
  }
  state.idleSeconds = 0;
  const warningBar = document.getElementById('inactivity-warning-bar');
  if (warningBar) warningBar.style.display = 'none';
}

function updateIdleTimerDisplay() {
  const timerText = document.getElementById('idle-timer-text');
  if (!timerText) return;
  const mins = Math.floor(state.idleSeconds / 60);
  const secs = state.idleSeconds % 60;
  timerText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function handleInactivityLogout(message) {
  stopInactivityWatchdog();
  state.token = null;
  state.user = null;
  localStorage.removeItem('hrms_token');
  localStorage.removeItem('hrms_user');

  setView('auth');
  switchAuthTab('login');
  showAlert(document.getElementById('login-alert'), `⏱️ <strong>${message}</strong>`, 'warning');
}

// ==========================================
// PASSWORD STRENGTH
// ==========================================

function evaluatePasswordStrength(password) {
  const minLength = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  let score = 0;
  if (minLength) score++;
  if (uppercase) score++;
  if (lowercase) score++;
  if (number) score++;
  if (specialChar) score++;

  return { score, checks: { minLength, uppercase, lowercase, number, specialChar } };
}

function updatePasswordStrengthUI(password) {
  const bar = document.getElementById('strength-bar');
  if (!bar) return;

  const chkLength = document.getElementById('chk-length');
  const chkUpper = document.getElementById('chk-upper');
  const chkLower = document.getElementById('chk-lower');
  const chkNumber = document.getElementById('chk-number');
  const chkSpecial = document.getElementById('chk-special');

  if (!password) {
    bar.className = 'strength-bar-fill';
    chkLength.className = 'strength-item invalid';
    chkUpper.className = 'strength-item invalid';
    chkLower.className = 'strength-item invalid';
    chkNumber.className = 'strength-item invalid';
    chkSpecial.className = 'strength-item invalid';
    return;
  }

  const { score, checks } = evaluatePasswordStrength(password);

  chkLength.className = `strength-item ${checks.minLength ? 'valid' : 'invalid'}`;
  chkUpper.className = `strength-item ${checks.uppercase ? 'valid' : 'invalid'}`;
  chkLower.className = `strength-item ${checks.lowercase ? 'valid' : 'invalid'}`;
  chkNumber.className = `strength-item ${checks.number ? 'valid' : 'invalid'}`;
  chkSpecial.className = `strength-item ${checks.specialChar ? 'valid' : 'invalid'}`;

  if (score <= 2) bar.className = 'strength-bar-fill weak';
  else if (score === 3) bar.className = 'strength-bar-fill fair';
  else if (score === 4) bar.className = 'strength-bar-fill good';
  else bar.className = 'strength-bar-fill strong';
}

// ==========================================
// VIEW & TAB ROUTER
// ==========================================

function setView(viewName) {
  state.currentView = viewName;

  document.getElementById('auth-view').classList.remove('active');
  document.getElementById('admin-view').classList.remove('active');
  document.getElementById('employee-view').classList.remove('active');

  const navUser = document.getElementById('nav-user');

  if (viewName === 'auth') {
    document.getElementById('auth-view').classList.add('active');
    if (navUser) navUser.style.display = 'none';
    stopInactivityWatchdog();
  } else if (viewName === 'admin') {
    document.getElementById('admin-view').classList.add('active');
    if (navUser) navUser.style.display = 'flex';
    updateNavUser();
    switchAdminTab('overview');
    loadAdminDashboard();
    startInactivityWatchdog();
  } else if (viewName === 'employee') {
    document.getElementById('employee-view').classList.add('active');
    if (navUser) navUser.style.display = 'flex';
    updateNavUser();
    switchEmpTab('overview');
    loadEmployeeDashboard();
    startInactivityWatchdog();
  }
}

function updateNavUser() {
  if (!state.user) return;
  document.getElementById('user-name').textContent = `${state.user.first_name} ${state.user.last_name}`;
  const badge = document.getElementById('user-badge');
  if (state.user.role === 'HR_ADMIN') {
    badge.textContent = 'HR ADMIN';
    badge.className = 'user-badge admin';
  } else {
    badge.textContent = 'EMPLOYEE';
    badge.className = 'user-badge employee';
  }
}

function switchAuthTab(tab) {
  state.authTab = tab;
  hideAlert(document.getElementById('login-alert'));
  hideAlert(document.getElementById('signup-alert'));

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginContainer = document.getElementById('login-form-container');
  const signupContainer = document.getElementById('signup-form-container');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginContainer.style.display = 'block';
    signupContainer.style.display = 'none';
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupContainer.style.display = 'block';
    loginContainer.style.display = 'none';
  }
}

function switchAdminTab(tabName) {
  const tabs = ['overview', 'flagged', 'directory', 'leaves', 'payroll'];
  tabs.forEach(t => {
    const el = document.getElementById(`admin-tab-${t}`);
    if (el) el.style.display = t === tabName ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('#admin-view .portal-nav-tab');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('active', tabs[idx] === tabName);
  });

  if (tabName === 'flagged') loadAdminFlaggedAttendance();
  else if (tabName === 'directory') loadAdminEmployees();
  else if (tabName === 'leaves') loadAdminLeaveQueue();
  else if (tabName === 'payroll') loadAdminPayroll();
}

function switchEmpTab(tabName) {
  const tabs = ['overview', 'kiosk', 'leaves', 'payslips', 'profile'];
  tabs.forEach(t => {
    const el = document.getElementById(`emp-tab-${t}`);
    if (el) el.style.display = t === tabName ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('#employee-view .portal-nav-tab');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('active', tabs[idx] === tabName);
  });

  if (tabName === 'kiosk') loadEmployeeAttendanceKiosk();
  else if (tabName === 'leaves') loadEmployeeLeaves();
  else if (tabName === 'payslips') loadEmployeePayslips();
  else if (tabName === 'profile') loadEmployeeProfile();
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

async function handleLogin(e) {
  e.preventDefault();
  const alertEl = document.getElementById('login-alert');
  hideAlert(alertEl);

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const res = await apiRequest('/login', 'POST', { email, password });

  if (res.ok) {
    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('hrms_token', state.token);
    localStorage.setItem('hrms_user', JSON.stringify(state.user));

    if (state.user.role === 'HR_ADMIN') setView('admin');
    else setView('employee');
  } else {
    if (res.status === 429) {
      showAlert(alertEl, `⚡ <strong>Rate Limit Exceeded:</strong> ${res.data.message}`, 'danger');
    } else if (res.status === 423) {
      showAlert(alertEl, `🔒 <strong>Account Locked:</strong> ${res.data.message}`, 'danger');
    } else if (res.status === 403 && res.data.is_verified === false) {
      showAlert(
        alertEl,
        `⚠️ <strong>Email Unverified:</strong> ${res.data.message}<br/>` +
        `<button class="btn btn-sm btn-outline" style="margin-top: 0.5rem;" onclick="openVerifyModal('${res.data.verification_token || ''}')">Verify Account Now</button>`,
        'warning'
      );
    } else {
      let msg = res.data.detail?.message || res.data.message || 'Login failed.';
      if (res.data.trials_remaining !== undefined) msg = `⚠️ ${msg}`;
      showAlert(alertEl, msg, 'danger');
    }
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const alertEl = document.getElementById('signup-alert');
  hideAlert(alertEl);

  const employee_id = document.getElementById('signup-empid').value.trim();
  const first_name = document.getElementById('signup-firstname').value.trim();
  const last_name = document.getElementById('signup-lastname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;

  const strength = evaluatePasswordStrength(password);
  if (strength.score < 5) {
    showAlert(alertEl, 'Password does not meet all security strength requirements.');
    return;
  }

  const payload = { employee_id, first_name, last_name, email, password, role };
  const res = await apiRequest('/signup', 'POST', payload);

  if (res.ok) {
    showAlert(
      alertEl,
      `🎉 <strong>Registration Successful!</strong> ${res.data.message}<br/>` +
      `<button class="btn btn-sm btn-outline" style="margin-top: 0.5rem;" onclick="openVerifyModal('${res.data.data.verification_token}')">One-Click Email Verification</button>`,
      'success'
    );
    document.getElementById('signup-form').reset();
    updatePasswordStrengthUI('');
  } else {
    let msg = res.data.detail?.message || res.data.message || 'Registration failed.';
    showAlert(alertEl, msg, 'danger');
  }
}

function handleLogout() {
  stopInactivityWatchdog();
  state.token = null;
  state.user = null;
  localStorage.removeItem('hrms_token');
  localStorage.removeItem('hrms_user');
  setView('auth');
  switchAuthTab('login');
}

function openVerifyModal(token = '') {
  document.getElementById('verify-token-input').value = token;
  hideAlert(document.getElementById('verify-alert'));
  document.getElementById('verify-modal').classList.add('show');
}

function closeVerifyModal() {
  document.getElementById('verify-modal').classList.remove('show');
}

async function handleVerifyEmail() {
  const alertEl = document.getElementById('verify-alert');
  hideAlert(alertEl);
  const token = document.getElementById('verify-token-input').value.trim();

  const res = await apiRequest('/api/auth/verify-email', 'POST', { token });
  if (res.ok) {
    showAlert(alertEl, `✅ ${res.data.message}`, 'success');
    setTimeout(() => {
      closeVerifyModal();
      switchAuthTab('login');
      showAlert(document.getElementById('login-alert'), 'Account verified successfully! You can now log in.', 'success');
    }, 1200);
  } else {
    showAlert(alertEl, res.data.detail?.message || res.data.message || 'Verification failed.', 'danger');
  }
}

// ==========================================
// HR ADMIN PORTAL MODULES
// ==========================================

async function loadAdminDashboard() {
  if (!state.token) return;
  document.getElementById('admin-greeting').textContent = `Welcome back, ${state.user.first_name}!`;

  const overviewRes = await apiRequest('/api/admin/overview');
  if (overviewRes.ok) {
    const data = overviewRes.data.data;
    document.getElementById('stat-total-staff').textContent = data.totalUsers;
    document.getElementById('stat-verified-staff').textContent = data.verifiedUsers;
  }

  // Load flagged count & leaves count
  const flaggedRes = await apiRequest('/api/v1/attendance/admin/flagged');
  if (flaggedRes.ok) {
    const count = flaggedRes.data.count || 0;
    document.getElementById('stat-flagged-count').textContent = count;
    document.getElementById('flagged-badge').textContent = count;
  }

  const leavesRes = await apiRequest('/api/v1/leaves/admin/queue');
  if (leavesRes.ok) {
    const count = leavesRes.data.count || 0;
    document.getElementById('stat-pending-leaves').textContent = count;
    document.getElementById('leaves-badge').textContent = count;
  }
}

async function loadAdminFlaggedAttendance() {
  const container = document.getElementById('flagged-cards-grid');
  const res = await apiRequest('/api/v1/attendance/admin/flagged');

  if (res.ok && res.data.flagged_logs && res.data.flagged_logs.length > 0) {
    container.innerHTML = res.data.flagged_logs.map(log => `
      <div class="flagged-card">
        <img src="${log.photo_url}" alt="Candidate Photo" class="flagged-photo">
        <div>
          <strong>${log.employee_name} (${log.employee_id})</strong><br/>
          <small style="color: var(--slate-500);">${log.department} • ${log.check_in_timestamp}</small>
        </div>
        <div style="font-size: 0.84rem; color: var(--danger); font-weight: 600;">
          📍 ${log.distance_meters > 1000 ? (log.distance_meters/1000).toFixed(1) + ' km' : log.distance_meters + ' m'} away from office
        </div>
        <p style="font-size: 0.8rem; color: var(--slate-600);">${log.notes || 'Outside 100m geofence'}</p>
        <a href="${log.maps_url}" target="_blank" class="btn btn-sm btn-outline">🗺️ View Location on Map</a>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <button class="btn btn-sm btn-primary" style="flex: 1;" onclick="actionFlaggedAttendance(${log.id}, 'APPROVE')">✓ Approve</button>
          <button class="btn btn-sm btn-danger-outline" style="flex: 1;" onclick="actionFlaggedAttendance(${log.id}, 'REJECT')">✕ Reject</button>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--slate-400); padding: 3rem;">✅ No flagged attendance check-ins requiring review.</div>`;
  }
}

async function actionFlaggedAttendance(logId, action) {
  const notes = prompt(`Enter optional review note for ${action}:`, action === 'APPROVE' ? 'Approved by HR Admin' : 'Location rejected');
  if (notes === null) return;

  const res = await apiRequest(`/api/v1/attendance/admin/verify/${logId}`, 'PATCH', { action, notes });
  if (res.ok) {
    loadAdminFlaggedAttendance();
    loadAdminDashboard();
  } else {
    alert(res.data.detail?.message || res.data.message || 'Action failed.');
  }
}

async function loadAdminEmployees() {
  const search = document.getElementById('admin-search-input').value.trim();
  const role = document.getElementById('admin-role-filter').value;
  let url = `/api/admin/employees?search=${encodeURIComponent(search)}`;
  if (role) url += `&role=${encodeURIComponent(role)}`;

  const res = await apiRequest(url);
  const tbody = document.getElementById('admin-emp-table-body');

  if (res.ok && res.data.employees) {
    tbody.innerHTML = res.data.employees.map(emp => `
      <tr>
        <td><strong>${emp.employee_id}</strong></td>
        <td>${emp.first_name} ${emp.last_name}</td>
        <td>${emp.email}</td>
        <td>${emp.department || 'General'}</td>
        <td><span class="badge ${emp.role === 'HR_ADMIN' ? 'badge-purple' : 'badge-info'}">${emp.role}</span></td>
        <td>$${(emp.base_salary || 5000).toFixed(2)}</td>
        <td>
          <span class="badge ${emp.is_locked ? 'badge-danger' : (emp.is_verified ? 'badge-success' : 'badge-warning')}">
            ${emp.is_locked ? 'Locked' : (emp.is_verified ? 'Verified' : 'Pending')}
          </span>
        </td>
        <td style="display: flex; gap: 0.3rem;">
          <button class="btn btn-sm btn-outline" onclick="promptEditEmployee(${emp.id}, '${emp.department || ''}', ${emp.base_salary || 5000})">Edit</button>
          ${emp.is_locked ? `<button class="btn btn-sm btn-danger-outline" onclick="unlockEmployeeAccount(${emp.id})">Unlock</button>` : ''}
        </td>
      </tr>
    `).join('');
  }
}

async function promptEditEmployee(empId, currentDept, currentSalary) {
  const newDept = prompt('Enter Department:', currentDept);
  if (newDept === null) return;
  const newSalary = prompt('Enter Base Monthly Salary ($):', currentSalary);
  if (newSalary === null) return;

  const res = await apiRequest(`/api/v1/profile/admin/${empId}`, 'PATCH', {
    department: newDept,
    base_salary: parseFloat(newSalary)
  });
  if (res.ok) {
    loadAdminEmployees();
  } else {
    alert(res.data.detail?.message || 'Update failed.');
  }
}

async function unlockEmployeeAccount(userId) {
  const res = await apiRequest(`/api/admin/employees/${userId}/unlock`, 'PATCH');
  if (res.ok) loadAdminEmployees();
}

async function loadAdminLeaveQueue() {
  const tbody = document.getElementById('admin-leaves-table-body');
  const res = await apiRequest('/api/v1/leaves/admin/queue');

  if (res.ok && res.data.pending_queue && res.data.pending_queue.length > 0) {
    tbody.innerHTML = res.data.pending_queue.map(l => `
      <tr>
        <td><strong>${l.employee_name}</strong><br/><small>${l.department}</small></td>
        <td><span class="badge badge-info">${l.type}</span></td>
        <td>${l.start_date} to ${l.end_date}</td>
        <td><strong>${l.days_count}</strong> days</td>
        <td>${l.reason}</td>
        <td>Paid: ${l.paid_balance}d | Sick: ${l.sick_balance}d</td>
        <td style="display: flex; gap: 0.35rem;">
          <button class="btn btn-sm btn-primary" onclick="actionLeave(${l.id}, 'APPROVE')">✓ Approve</button>
          <button class="btn btn-sm btn-danger-outline" onclick="actionLeave(${l.id}, 'REJECT')">✕ Reject</button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 2rem;">No pending leave requests.</td></tr>`;
  }
}

async function actionLeave(leaveId, action) {
  const comments = prompt(`Enter comments for ${action}:`, action === 'APPROVE' ? 'Approved by HR' : 'Denied');
  if (comments === null) return;

  const res = await apiRequest(`/api/v1/leaves/admin/action/${leaveId}`, 'PATCH', { action, admin_comments: comments });
  if (res.ok) {
    loadAdminLeaveQueue();
    loadAdminDashboard();
  } else {
    alert(res.data.detail?.message || 'Action failed.');
  }
}

async function loadAdminPayroll() {
  const tbody = document.getElementById('admin-payroll-table-body');
  const res = await apiRequest('/api/v1/payroll/admin/overview');

  if (res.ok && res.data.payroll_sheet) {
    tbody.innerHTML = res.data.payroll_sheet.map(p => `
      <tr>
        <td><strong>${p.employee_name}</strong> (${p.employee_id})</td>
        <td>${p.department}</td>
        <td>$${p.base_salary.toFixed(2)}</td>
        <td>+$${p.allowances.toFixed(2)}</td>
        <td>-$${p.deductions.toFixed(2)}</td>
        <td><strong style="color: var(--primary);">$${p.net_pay.toFixed(2)}</strong></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="promptAdjustPayroll(${p.user_id}, ${p.base_salary}, ${p.allowances}, ${p.deductions})">Adjust</button>
        </td>
      </tr>
    `).join('');
  }
}

async function promptAdjustPayroll(userId, base, allow, ded) {
  const newBase = prompt('Base Salary:', base);
  if (newBase === null) return;
  const newAllow = prompt('Allowances:', allow);
  if (newAllow === null) return;
  const newDed = prompt('Deductions:', ded);
  if (newDed === null) return;

  const res = await apiRequest(`/api/v1/payroll/admin/adjust/${userId}`, 'PUT', {
    base_salary: parseFloat(newBase),
    allowances: parseFloat(newAllow),
    deductions: parseFloat(newDed)
  });
  if (res.ok) loadAdminPayroll();
}

async function finalizePayrollCycle() {
  const period = prompt('Confirm pay period cycle (e.g. 2026-08):', '2026-08');
  if (!period) return;

  const res = await apiRequest('/api/v1/payroll/admin/finalize', 'POST', { pay_period: period });
  if (res.ok) {
    alert(`🎉 ${res.data.message}`);
    loadAdminPayroll();
  }
}

// ==========================================
// EMPLOYEE PORTAL MODULES
// ==========================================

async function loadEmployeeDashboard() {
  if (!state.token) return;
  document.getElementById('emp-greeting').textContent = `Welcome back, ${state.user.first_name}!`;
  document.getElementById('emp-id-display').textContent = state.user.employee_id || 'N/A';
  document.getElementById('emp-email-display').textContent = state.user.email || 'N/A';

  const profRes = await apiRequest('/api/v1/profile');
  if (profRes.ok) {
    const p = profRes.data.profile;
    document.getElementById('emp-leave-paid-count').textContent = p.leave_balance_paid;
    document.getElementById('emp-leave-sick-count').textContent = p.leave_balance_sick;
    document.getElementById('emp-salary-display').textContent = `$${p.base_salary.toFixed(2)}`;
    document.getElementById('emp-dept-display').textContent = `${p.job_title} • ${p.department}`;
  }

  // Load today's attendance status
  const attRes = await apiRequest('/api/v1/attendance/my-logs');
  if (attRes.ok && attRes.data.logs && attRes.data.logs.length > 0) {
    const latest = attRes.data.logs[0];
    document.getElementById('emp-attendance-status').textContent = latest.status;
    document.getElementById('emp-checkin-time').textContent = latest.check_in_timestamp.split('T')[1]?.substring(0, 5) || 'Checked-in';
  }
}

// Smart Kiosk Location & Camera Functions
function setKioskLocationPreset(preset) {
  if (preset === 'office') {
    state.kioskLat = OFFICE_LAT;
    state.kioskLon = OFFICE_LON;
  } else {
    state.kioskLat = 13.0827; // Chennai coordinates (remote)
    state.kioskLon = 80.2707;
  }
  updateKioskLocationUI();
}

function captureLiveGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.kioskLat = pos.coords.latitude;
        state.kioskLon = pos.coords.longitude;
        updateKioskLocationUI();
      },
      err => alert('Unable to retrieve GPS coordinates: ' + err.message)
    );
  } else {
    alert('Geolocation not supported by browser.');
  }
}

function calculateDistanceClient(lat1, lon1, lat2 = OFFICE_LAT, lon2 = OFFICE_LON) {
  const R = 6371000;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi/2)**2 + Math.cos(phi1)*Math.cos(phi2)*Math.sin(deltaLambda/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function updateKioskLocationUI() {
  const dist = calculateDistanceClient(state.kioskLat, state.kioskLon);
  document.getElementById('kiosk-coords-display').textContent = `${state.kioskLat.toFixed(4)}, ${state.kioskLon.toFixed(4)}`;
  document.getElementById('kiosk-dist-display').textContent = dist > 1000 ? `${(dist/1000).toFixed(1)} km` : `${dist.toFixed(1)} meters`;

  const tag = document.getElementById('kiosk-geo-tag');
  if (dist <= 100) {
    tag.textContent = 'Within 100m Geofence';
    tag.style.color = 'var(--success)';
  } else {
    tag.textContent = 'Outside Geofence (Will Flag)';
    tag.style.color = 'var(--danger)';
  }
}

async function executeKioskCheckIn() {
  const alertEl = document.getElementById('kiosk-alert');
  hideAlert(alertEl);

  const payload = {
    photo_url: state.kioskPhoto,
    latitude: state.kioskLat,
    longitude: state.kioskLon
  };

  const res = await apiRequest('/api/v1/attendance/kiosk/check-in', 'POST', payload);
  if (res.ok) {
    const isWithin = res.data.data.is_within_geofence;
    showAlert(
      alertEl,
      isWithin
        ? `✅ <strong>Present:</strong> ${res.data.message}`
        : `⚠️ <strong>Flagged:</strong> ${res.data.message}`,
      isWithin ? 'success' : 'warning'
    );
    loadEmployeeAttendanceKiosk();
    loadEmployeeDashboard();
  } else {
    showAlert(alertEl, res.data.detail?.message || 'Check-in failed.');
  }
}

async function executeKioskCheckOut() {
  const alertEl = document.getElementById('kiosk-alert');
  hideAlert(alertEl);

  const res = await apiRequest('/api/v1/attendance/kiosk/check-out', 'POST', { photo_url: state.kioskPhoto });
  if (res.ok) {
    showAlert(alertEl, '🚪 Check-out recorded successfully.', 'success');
    loadEmployeeAttendanceKiosk();
  } else {
    showAlert(alertEl, res.data.detail?.message || 'Check-out failed.');
  }
}

async function loadEmployeeAttendanceKiosk() {
  updateKioskLocationUI();
  const tbody = document.getElementById('emp-attendance-history-body');
  const res = await apiRequest('/api/v1/attendance/my-logs');

  if (res.ok && res.data.logs) {
    tbody.innerHTML = res.data.logs.map(l => `
      <tr>
        <td>${l.check_in_timestamp}</td>
        <td><img src="${l.check_in_photo_url}" style="width: 38px; height: 38px; border-radius: 4px; object-fit: cover;"></td>
        <td>${l.distance_meters > 1000 ? (l.distance_meters/1000).toFixed(1) + ' km' : l.distance_meters.toFixed(0) + ' m'}</td>
        <td>
          <span class="badge ${l.status === 'PRESENT' ? 'badge-success' : (l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning')}">
            ${l.status}
          </span>
        </td>
      </tr>
    `).join('');
  }
}

// Leaves
async function submitLeaveApplication(e) {
  e.preventDefault();
  const alertEl = document.getElementById('emp-leave-alert');
  hideAlert(alertEl);

  const type = document.getElementById('leave-type-input').value;
  const start_date = document.getElementById('leave-start-input').value;
  const end_date = document.getElementById('leave-end-input').value;
  const reason = document.getElementById('leave-reason-input').value;

  const res = await apiRequest('/api/v1/leaves/apply', 'POST', { type, start_date, end_date, reason });
  if (res.ok) {
    showAlert(alertEl, `🎉 ${res.data.message}`, 'success');
    document.getElementById('emp-leave-form').reset();
    loadEmployeeLeaves();
  } else {
    showAlert(alertEl, res.data.detail?.message || 'Leave application failed.');
  }
}

async function loadEmployeeLeaves() {
  const tbody = document.getElementById('emp-leaves-table-body');
  const res = await apiRequest('/api/v1/leaves/my-requests');

  if (res.ok && res.data.leave_requests) {
    tbody.innerHTML = res.data.leave_requests.map(l => `
      <tr>
        <td><span class="badge badge-info">${l.type}</span></td>
        <td>${l.start_date} to ${l.end_date}</td>
        <td>${l.days_count} days</td>
        <td>${l.reason}</td>
        <td>
          <span class="badge ${l.status === 'APPROVED' ? 'badge-success' : (l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning')}">
            ${l.status}
          </span>
        </td>
      </tr>
    `).join('');
  }
}

// Payslips
async function loadEmployeePayslips() {
  const container = document.getElementById('payslips-cards-container');
  const res = await apiRequest('/api/v1/payroll/my-payslips');

  if (res.ok && res.data.payslips && res.data.payslips.length > 0) {
    container.innerHTML = res.data.payslips.map(p => `
      <div class="payslip-card">
        <div class="payslip-header">
          <div>
            <strong>Pay Period: ${p.pay_period}</strong><br/>
            <small style="color: var(--slate-500);">${p.job_title} • ${p.department}</small>
          </div>
          <span class="badge badge-success">${p.status}</span>
        </div>
        <div class="payslip-row"><span>Base Salary:</span><strong>$${p.base_salary.toFixed(2)}</strong></div>
        <div class="payslip-row"><span>Allowances:</span><strong style="color: var(--success);">+$${p.allowances.toFixed(2)}</strong></div>
        <div class="payslip-row"><span>Tax & Deductions:</span><strong style="color: var(--danger);">-$${p.deductions.toFixed(2)}</strong></div>
        <div class="payslip-net"><span>Net Pay Disbursed:</span><span>$${p.net_pay.toFixed(2)}</span></div>
        <button class="btn btn-sm btn-outline btn-block" style="margin-top: 1rem;" onclick="window.print()">🖨️ Print Payslip</button>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--slate-400); padding: 2rem;">No payslips generated yet.</div>`;
  }
}

// Profile
async function loadEmployeeProfile() {
  const res = await apiRequest('/api/v1/profile');
  if (res.ok) {
    const p = res.data.profile;
    document.getElementById('prof-phone-input').value = p.phone === 'Not provided' ? '' : p.phone;
    document.getElementById('prof-address-input').value = p.address === 'Not provided' ? '' : p.address;
    document.getElementById('prof-avatar-input').value = p.profile_picture_url || '';
  }
}

async function submitSelfProfileUpdate(e) {
  e.preventDefault();
  const alertEl = document.getElementById('profile-alert');
  hideAlert(alertEl);

  const phone = document.getElementById('prof-phone-input').value.trim();
  const address = document.getElementById('prof-address-input').value.trim();
  const profile_picture_url = document.getElementById('prof-avatar-input').value.trim();

  const res = await apiRequest('/api/v1/profile/self', 'PATCH', { phone, address, profile_picture_url });
  if (res.ok) {
    showAlert(alertEl, 'Profile updated successfully!', 'success');
  } else {
    showAlert(alertEl, 'Failed to update profile.');
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

function initApp() {
  document.getElementById('tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-signup').addEventListener('click', () => switchAuthTab('signup'));

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  document.getElementById('signup-password').addEventListener('input', (e) => updatePasswordStrengthUI(e.target.value));

  document.getElementById('toggle-login-pass').addEventListener('click', () => {
    const p = document.getElementById('login-password');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('toggle-signup-pass').addEventListener('click', () => {
    const p = document.getElementById('signup-password');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('btn-demo-admin').addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@mybuddyhrms.com';
    document.getElementById('login-password').value = 'Admin@12345';
    hideAlert(document.getElementById('login-alert'));
  });

  document.getElementById('btn-demo-employee').addEventListener('click', () => {
    document.getElementById('login-email').value = 'john.doe@mybuddyhrms.com';
    document.getElementById('login-password').value = 'Employee@12345';
    hideAlert(document.getElementById('login-alert'));
  });

  document.getElementById('btn-submit-verify').addEventListener('click', handleVerifyEmail);
  document.getElementById('btn-close-verify-modal').addEventListener('click', closeVerifyModal);

  const searchInput = document.getElementById('admin-search-input');
  if (searchInput) searchInput.addEventListener('input', () => loadAdminEmployees());

  const roleFilter = document.getElementById('admin-role-filter');
  if (roleFilter) roleFilter.addEventListener('change', () => loadAdminEmployees());

  if (state.token && state.user) {
    if (state.user.role === 'HR_ADMIN') setView('admin');
    else setView('employee');
  } else {
    setView('auth');
    switchAuthTab('login');
  }
}

// Window globals for inline HTML triggers
window.switchAdminTab = switchAdminTab;
window.switchEmpTab = switchEmpTab;
window.actionFlaggedAttendance = actionFlaggedAttendance;
window.promptEditEmployee = promptEditEmployee;
window.unlockEmployeeAccount = unlockEmployeeAccount;
window.actionLeave = actionLeave;
window.promptAdjustPayroll = promptAdjustPayroll;
window.finalizePayrollCycle = finalizePayrollCycle;
window.setKioskLocationPreset = setKioskLocationPreset;
window.captureLiveGPS = captureLiveGPS;
window.executeKioskCheckIn = executeKioskCheckIn;
window.executeKioskCheckOut = executeKioskCheckOut;
window.submitLeaveApplication = submitLeaveApplication;
window.submitSelfProfileUpdate = submitSelfProfileUpdate;
window.openVerifyModal = openVerifyModal;
window.closeVerifyModal = closeVerifyModal;

document.addEventListener('DOMContentLoaded', initApp);
