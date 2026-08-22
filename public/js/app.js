/**
 * Dayflow HRMS Client Application (8 Task Prompts & Exact Data Dictionary)
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
  kioskPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
  calendarMode: 'month',
  calendarMonth: new Date().toISOString().substring(0, 7) // YYYY-MM
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

    if (res.status === 401 && (result.inactivity_logout || result.detail?.inactivity_logout)) {
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
// VIEW & TAB ROUTER (Prompt 3 & 4)
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
  const tabs = ['overview', 'context_switcher', 'flagged', 'directory', 'leaves', 'payroll'];
  tabs.forEach(t => {
    const el = document.getElementById(`admin-tab-${t}`);
    if (el) el.style.display = t === tabName ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('#admin-view .portal-nav-tab');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('active', tabs[idx] === tabName);
  });

  if (tabName === 'context_switcher') loadAdminContextUserOptions();
  else if (tabName === 'flagged') loadAdminFlaggedAttendance();
  else if (tabName === 'directory') loadAdminEmployees();
  else if (tabName === 'leaves') loadAdminLeaveQueue();
  else if (tabName === 'payroll') loadAdminPayroll();
}

function switchEmpTab(tabName) {
  const tabs = ['overview', 'kiosk', 'calendar', 'leaves', 'payslips', 'profile'];
  tabs.forEach(t => {
    const el = document.getElementById(`emp-tab-${t}`);
    if (el) el.style.display = t === tabName ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('#employee-view .portal-nav-tab');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('active', tabs[idx] === tabName);
  });

  if (tabName === 'kiosk') loadEmployeeAttendanceKiosk();
  else if (tabName === 'calendar') loadEmployeeCalendar();
  else if (tabName === 'leaves') loadEmployeeLeaves();
  else if (tabName === 'payslips') loadEmployeePayslips();
  else if (tabName === 'profile') loadEmployeeProfile();
}

// ==========================================
// PROMPT 2 & 3: AUTHENTICATION ENGINE
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
    const detail = res.data.detail || res.data;
    if (res.status === 429) {
      showAlert(alertEl, `⚡ <strong>Rate Limit Exceeded:</strong> ${detail.message}`, 'danger');
    } else if (res.status === 423) {
      showAlert(alertEl, `🔒 <strong>Account Locked:</strong> ${detail.message}`, 'danger');
    } else if (res.status === 403 && detail.is_email_verified === false) {
      showAlert(
        alertEl,
        `⚠️ <strong>Email Unverified:</strong> ${detail.message}<br/>` +
        `<button class="btn btn-sm btn-outline" style="margin-top: 0.5rem;" onclick="openVerifyModal('${detail.verification_token || ''}')">One-Click Email Verification</button>`,
        'warning'
      );
    } else {
      let msg = detail.message || 'Login failed.';
      if (detail.trials_remaining !== undefined) msg = `⚠️ ${msg}`;
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

  const res = await apiRequest(`/verify-email?token=${encodeURIComponent(token)}`);
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
// PROMPT 4.2: ADMIN DASHBOARD & CONTEXT SWITCHER
// ==========================================

async function loadAdminDashboard() {
  if (!state.token) return;
  document.getElementById('admin-greeting').textContent = `Welcome back, ${state.user.first_name}!`;

  const overviewRes = await apiRequest('/api/admin/overview');
  if (overviewRes.ok) {
    const data = overviewRes.data.data;
    document.getElementById('stat-total-staff').textContent = data.totalUsers;
    document.getElementById('stat-verified-staff').textContent = data.verifiedUsers;
    document.getElementById('stat-flagged-count').textContent = data.flaggedAttendance;
    document.getElementById('stat-pending-leaves').textContent = data.pendingLeaves;
    document.getElementById('flagged-badge').textContent = data.flaggedAttendance;
    document.getElementById('leaves-badge').textContent = data.pendingLeaves;
  }
}

async function loadAdminContextUserOptions() {
  const select = document.getElementById('admin-context-user-select');
  const res = await apiRequest('/api/admin/employees');

  if (res.ok && res.data.employees) {
    select.innerHTML = '<option value="">Select an employee to switch view context...</option>' +
      res.data.employees.map(e => `<option value="${e.user_id}">${e.full_name} (${e.employee_id} • ${e.department})</option>`).join('');
  }
}

async function handleContextUserChange() {
  const select = document.getElementById('admin-context-user-select');
  const userId = select.value;
  const card = document.getElementById('context-user-details-card');
  const emptyMsg = document.getElementById('context-empty-msg');

  if (!userId) {
    card.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  const res = await apiRequest(`/api/admin/employees/${userId}/context-view`);
  if (res.ok) {
    const u = res.data.context_user;
    document.getElementById('ctx-emp-name').textContent = `${u.first_name} ${u.last_name}`;
    document.getElementById('ctx-emp-id').textContent = `${u.employee_id} • ${u.email}`;
    document.getElementById('ctx-emp-dept').textContent = u.department || 'General';
    document.getElementById('ctx-emp-role').textContent = u.job_title || u.role;
    document.getElementById('ctx-emp-salary').textContent = `$${u.salary_base.toFixed(2)}`;
    document.getElementById('ctx-emp-net').textContent = `Net: $${u.net_salary.toFixed(2)}`;

    const docsLink = document.getElementById('ctx-emp-docs-link');
    docsLink.href = u.documents_url || '#';

    // Render context attendance table
    const attBody = document.getElementById('ctx-attendance-table-body');
    if (res.data.attendance_logs && res.data.attendance_logs.length > 0) {
      attBody.innerHTML = res.data.attendance_logs.map(l => `
        <tr>
          <td>${l.attendance_date}</td>
          <td>${l.check_in_time || '-'}</td>
          <td>${l.check_out_time || '-'}</td>
          <td><span class="badge ${l.is_within_geofence ? 'badge-success' : 'badge-warning'}">${l.is_within_geofence ? 'Inside' : 'Outside'}</span></td>
          <td><span class="badge ${l.attendance_status === 'PRESENT' ? 'badge-success' : 'badge-info'}">${l.attendance_status}</span></td>
          <td><span class="badge ${l.approval_status === 'APPROVED' || l.approval_status === 'AUTO_APPROVED' ? 'badge-success' : 'badge-danger'}">${l.approval_status}</span></td>
        </tr>
      `).join('');
    } else {
      attBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--slate-400); padding: 1.5rem;">No recent attendance logs for this member.</td></tr>`;
    }

    card.style.display = 'block';
    emptyMsg.style.display = 'none';
  }
}

async function loadAdminFlaggedAttendance() {
  const container = document.getElementById('flagged-cards-grid');
  const res = await apiRequest('/api/v1/attendance/admin/flagged');

  if (res.ok && res.data.flagged_logs && res.data.flagged_logs.length > 0) {
    container.innerHTML = res.data.flagged_logs.map(log => `
      <div class="flagged-card">
        <img src="${log.check_in_photo_url}" alt="Candidate Photo" class="flagged-photo">
        <div>
          <strong>${log.employee_name} (${log.employee_id})</strong><br/>
          <small style="color: var(--slate-500);">${log.department} • ${log.attendance_date} ${log.check_in_time || ''}</small>
        </div>
        <div style="font-size: 0.84rem; color: var(--danger); font-weight: 600;">
          📍 GPS: ${log.check_in_latitude.toFixed(4)}, ${log.check_in_longitude.toFixed(4)}
        </div>
        <p style="font-size: 0.8rem; color: var(--slate-600);">${log.admin_comment || 'Outside 100m geofence'}</p>
        <a href="${log.maps_url}" target="_blank" class="btn btn-sm btn-outline">🗺️ View Location on Map</a>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <button class="btn btn-sm btn-primary" style="flex: 1;" onclick="actionFlaggedAttendance(${log.attendance_id}, 'APPROVED')">✓ Approve</button>
          <button class="btn btn-sm btn-danger-outline" style="flex: 1;" onclick="actionFlaggedAttendance(${log.attendance_id}, 'REJECTED')">✕ Reject</button>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--slate-400); padding: 3rem;">✅ No flagged attendance entries requiring review.</div>`;
  }
}

async function actionFlaggedAttendance(attId, approval_status) {
  const comment = prompt(`Enter optional review note for ${approval_status}:`, approval_status === 'APPROVED' ? 'Approved by HR Director' : 'Location rejected');
  if (comment === null) return;

  const res = await apiRequest(`/api/v1/attendance/admin/verify/${attId}`, 'PATCH', { approval_status, admin_comment: comment });
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
        <td><img src="${emp.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;"></td>
        <td><strong>${emp.employee_id}</strong></td>
        <td>${emp.first_name} ${emp.last_name}</td>
        <td>${emp.email}</td>
        <td>${emp.department || 'General'}</td>
        <td><span class="badge ${emp.role === 'HR_ADMIN' ? 'badge-purple' : 'badge-info'}">${emp.role}</span></td>
        <td>$${(emp.salary_base || 5000).toFixed(2)}</td>
        <td><a href="${emp.documents_url}" target="_blank" style="font-size: 0.8rem; color: var(--primary);">📄 KYC Doc</a></td>
        <td style="display: flex; gap: 0.3rem;">
          <button class="btn btn-sm btn-outline" onclick="promptEditEmployee(${emp.user_id}, '${emp.department || ''}', ${emp.salary_base || 5000})">Edit</button>
          ${emp.is_locked ? `<button class="btn btn-sm btn-danger-outline" onclick="unlockEmployeeAccount(${emp.user_id})">Unlock</button>` : ''}
        </td>
      </tr>
    `).join('');
  }
}

async function promptEditEmployee(userId, currentDept, currentSalary) {
  const newDept = prompt('Enter Department:', currentDept);
  if (newDept === null) return;
  const newSalary = prompt('Enter salary_base ($):', currentSalary);
  if (newSalary === null) return;

  const res = await apiRequest(`/api/v1/profile/admin/${userId}`, 'PATCH', {
    department: newDept,
    salary_base: parseFloat(newSalary)
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
        <td><span class="badge badge-info">${l.leave_type}</span></td>
        <td>${l.start_date} to ${l.end_date}</td>
        <td>${l.leave_reason}</td>
        <td>Paid: ${l.paid_balance}d | Sick: ${l.sick_balance}d</td>
        <td style="display: flex; gap: 0.35rem;">
          <button class="btn btn-sm btn-primary" onclick="actionLeave(${l.leave_id}, 'APPROVED')">✓ Approve</button>
          <button class="btn btn-sm btn-danger-outline" onclick="actionLeave(${l.leave_id}, 'REJECTED')">✕ Reject</button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--slate-400); padding: 2rem;">No pending leave requests.</td></tr>`;
  }
}

async function actionLeave(leaveId, leave_status) {
  const comment = prompt(`Enter optional admin_comment for ${leave_status}:`, leave_status === 'APPROVED' ? 'Approved by HR Director' : 'Denied');
  if (comment === null) return;

  const res = await apiRequest(`/api/v1/leaves/admin/action/${leaveId}`, 'PATCH', { leave_status, admin_comment: comment });
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
        <td>$${p.salary_base.toFixed(2)}</td>
        <td>+$${p.salary_allowances.toFixed(2)}</td>
        <td>-$${p.salary_deductions.toFixed(2)}</td>
        <td><strong style="color: var(--primary);">$${p.net_salary.toFixed(2)}</strong></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="promptAdjustPayroll(${p.user_id}, ${p.salary_base}, ${p.salary_allowances}, ${p.salary_deductions})">Adjust</button>
        </td>
      </tr>
    `).join('');
  }
}

async function promptAdjustPayroll(userId, base, allow, ded) {
  const newBase = prompt('salary_base ($):', base);
  if (newBase === null) return;
  const newAllow = prompt('salary_allowances ($):', allow);
  if (newAllow === null) return;
  const newDed = prompt('salary_deductions ($):', ded);
  if (newDed === null) return;

  const res = await apiRequest(`/api/v1/payroll/admin/adjust/${userId}`, 'PUT', {
    salary_base: parseFloat(newBase),
    salary_allowances: parseFloat(newAllow),
    salary_deductions: parseFloat(newDed)
  });
  if (res.ok) loadAdminPayroll();
}

// ==========================================
// PROMPT 4.1: EMPLOYEE DASHBOARD & METRICS
// ==========================================

async function loadEmployeeDashboard() {
  if (!state.token) return;
  document.getElementById('emp-greeting').textContent = `Welcome back, ${state.user.first_name}!`;
  document.getElementById('emp-id-display').textContent = state.user.employee_id || 'N/A';
  document.getElementById('emp-email-display').textContent = state.user.email || 'N/A';

  const res = await apiRequest('/api/employee/dashboard');
  if (res.ok) {
    const p = res.data.data.profile;
    document.getElementById('emp-leave-paid-count').textContent = p.leave_balance_paid;
    document.getElementById('emp-leave-sick-count').textContent = p.leave_balance_sick;
    document.getElementById('emp-salary-display').textContent = `$${p.salary_base.toFixed(2)} / $${p.net_salary.toFixed(2)}`;
    document.getElementById('emp-dept-display').textContent = `${p.job_title} • ${p.department}`;

    // Recent announcements (Prompt 4.1)
    const annList = document.getElementById('emp-announcements-list');
    if (res.data.data.announcements && res.data.data.announcements.length > 0) {
      annList.innerHTML = res.data.data.announcements.map(a => `
        <div class="announcement-card">
          <div class="announcement-title">${a.title}</div>
          <div class="announcement-msg">${a.message}</div>
          <div class="announcement-time">Posted on ${a.posted_at}</div>
        </div>
      `).join('');
    } else {
      annList.innerHTML = `<div style="color: var(--slate-400);">No new announcements.</div>`;
    }

    // Latest attendance
    if (res.data.data.recent_attendance && res.data.data.recent_attendance.length > 0) {
      const latest = res.data.data.recent_attendance[0];
      document.getElementById('emp-attendance-status').textContent = latest.attendance_status;
      document.getElementById('emp-checkin-time').textContent = latest.check_in_time || 'Checked-In';
    }
  }
}

// ==========================================
// PROMPT 6: SMART KIOSK & INTERACTIVE CALENDAR
// ==========================================

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
    tag.textContent = 'Within 100m Geofence (Auto-Approved)';
    tag.style.color = 'var(--success)';
  } else {
    tag.textContent = 'Outside Geofence (Will Flag for Admin Review)';
    tag.style.color = 'var(--danger)';
  }
}

async function executeKioskCheckIn() {
  const alertEl = document.getElementById('kiosk-alert');
  hideAlert(alertEl);

  const payload = {
    check_in_photo_url: state.kioskPhoto,
    check_in_latitude: state.kioskLat,
    check_in_longitude: state.kioskLon
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

  const res = await apiRequest('/api/v1/attendance/kiosk/check-out', 'POST', { check_out_photo_url: state.kioskPhoto });
  if (res.ok) {
    showAlert(alertEl, '🚪 Check-out timestamp recorded successfully.', 'success');
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
        <td>${l.attendance_date}</td>
        <td>${l.check_in_time || '-'}</td>
        <td>${l.check_out_time || '-'}</td>
        <td><span class="badge ${l.is_within_geofence ? 'badge-success' : 'badge-warning'}">${l.is_within_geofence ? 'Inside' : 'Outside'}</span></td>
        <td><span class="badge ${l.attendance_status === 'PRESENT' ? 'badge-success' : 'badge-info'}">${l.attendance_status}</span></td>
        <td><span class="badge ${l.approval_status === 'APPROVED' || l.approval_status === 'AUTO_APPROVED' ? 'badge-success' : 'badge-danger'}">${l.approval_status}</span></td>
      </tr>
    `).join('');
  }
}

// PROMPT 6.3: MONTHLY INTERACTIVE CALENDAR LOGIC
function setCalendarViewMode(mode) {
  state.calendarMode = mode;
  const btns = document.querySelectorAll('.calendar-controls .btn-group .btn');
  btns.forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(mode)));

  const grid = document.getElementById('calendar-month-grid');
  const list = document.getElementById('calendar-list-view');

  if (mode === 'month') {
    grid.style.display = 'grid';
    list.style.display = 'none';
    loadEmployeeCalendar();
  } else {
    grid.style.display = 'none';
    list.style.display = 'block';
    renderCalendarListView(mode);
  }
}

async function loadEmployeeCalendar() {
  const picker = document.getElementById('calendar-month-picker');
  if (picker && picker.value) state.calendarMonth = picker.value;
  else if (picker) picker.value = state.calendarMonth;

  const res = await apiRequest(`/api/v1/attendance/calendar?month=${state.calendarMonth}`);
  if (!res.ok) return;

  const attMap = res.data.attendance_by_date || {};
  const leaveMap = res.data.approved_leaves_by_date || {};

  const [yearStr, monthStr] = state.calendarMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon...
  const daysInMonth = new Date(year, month, 0).getDate();

  const grid = document.getElementById('calendar-month-grid');
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = daysOfWeek.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

  // Empty cells before 1st of month
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="calendar-day-cell empty"></div>`;
  }

  const todayStr = new Date().toISOString().substring(0, 10);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayPadded = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `${state.calendarMonth}-${dayPadded}`;
    const isToday = dateStr === todayStr;

    let pillHtml = '';
    if (attMap[dateStr]) {
      const att = attMap[dateStr];
      const statusClass = att.attendance_status.toLowerCase();
      pillHtml = `<div class="cal-status-pill status-${statusClass}">${att.attendance_status}</div>`;
    } else if (leaveMap[dateStr]) {
      pillHtml = `<div class="cal-status-pill status-leave">LEAVE (${leaveMap[dateStr].leave_type})</div>`;
    }

    html += `
      <div class="calendar-day-cell ${isToday ? 'today' : ''}">
        <div class="cal-date-num">${day}</div>
        ${pillHtml}
      </div>
    `;
  }

  grid.innerHTML = html;
}

async function renderCalendarListView(mode) {
  const tbody = document.getElementById('calendar-list-body');
  const res = await apiRequest(`/api/v1/attendance/calendar?month=${state.calendarMonth}`);
  if (!res.ok) return;

  const attMap = res.data.attendance_by_date || {};
  const leaveMap = res.data.approved_leaves_by_date || {};

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [yearStr, monthStr] = state.calendarMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  let rows = [];
  const limit = mode === 'week' ? 7 : daysInMonth;

  for (let day = 1; day <= limit; day++) {
    const dayPadded = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `${state.calendarMonth}-${dayPadded}`;
    const dayName = daysOfWeek[new Date(year, month - 1, day).getDay()];

    const att = attMap[dateStr];
    const leave = leaveMap[dateStr];

    const status = att ? att.attendance_status : (leave ? `LEAVE (${leave.leave_type})` : 'ABSENT');
    const approval = att ? att.approval_status : (leave ? 'APPROVED' : '-');
    const checkin = att?.check_in_time || '-';
    const checkout = att?.check_out_time || '-';

    rows.push(`
      <tr>
        <td><strong>${dateStr}</strong></td>
        <td>${dayName}</td>
        <td>${checkin}</td>
        <td>${checkout}</td>
        <td><span class="badge ${status === 'PRESENT' ? 'badge-success' : (status.includes('LEAVE') ? 'badge-purple' : 'badge-danger')}">${status}</span></td>
        <td><span class="badge badge-info">${approval}</span></td>
      </tr>
    `);
  }

  tbody.innerHTML = rows.join('');
}

// ==========================================
// PROMPT 7: LEAVE MANAGEMENT
// ==========================================

async function submitLeaveApplication(e) {
  e.preventDefault();
  const alertEl = document.getElementById('emp-leave-alert');
  hideAlert(alertEl);

  const leave_type = document.getElementById('leave-type-input').value;
  const start_date = document.getElementById('leave-start-input').value;
  const end_date = document.getElementById('leave-end-input').value;
  const leave_reason = document.getElementById('leave-reason-input').value;

  const res = await apiRequest('/api/v1/leaves/apply', 'POST', { leave_type, start_date, end_date, leave_reason });
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
        <td><span class="badge badge-info">${l.leave_type}</span></td>
        <td>${l.start_date} to ${l.end_date}</td>
        <td>${l.leave_reason}</td>
        <td>
          <span class="badge ${l.leave_status === 'APPROVED' ? 'badge-success' : (l.leave_status === 'REJECTED' ? 'badge-danger' : 'badge-warning')}">
            ${l.leave_status}
          </span>
        </td>
        <td>${l.admin_comment || '-'}</td>
      </tr>
    `).join('');
  }
}

// ==========================================
// PROMPT 8: PAYROLL & COMPLIANCE
// ==========================================

async function loadEmployeePayslips() {
  const container = document.getElementById('payslips-cards-container');
  const res = await apiRequest('/api/v1/payroll/my-payslips');

  if (res.ok && res.data.payroll_records && res.data.payroll_records.length > 0) {
    container.innerHTML = res.data.payroll_records.map(p => `
      <div class="payslip-card">
        <div class="payslip-header">
          <div>
            <strong>${p.employee_name} (${p.employee_id})</strong><br/>
            <small style="color: var(--slate-500);">${p.job_title} • ${p.department}</small>
          </div>
          <span class="badge badge-success">Disbursed</span>
        </div>
        <div class="payslip-row"><span>salary_base:</span><strong>$${p.salary_base.toFixed(2)}</strong></div>
        <div class="payslip-row"><span>salary_allowances:</span><strong style="color: var(--success);">+$${p.salary_allowances.toFixed(2)}</strong></div>
        <div class="payslip-row"><span>salary_deductions:</span><strong style="color: var(--danger);">-$${p.salary_deductions.toFixed(2)}</strong></div>
        <div class="payslip-net"><span>Calculated net_salary:</span><span>$${p.net_salary.toFixed(2)}</span></div>
        <button class="btn btn-sm btn-outline btn-block" style="margin-top: 1rem;" onclick="window.print()">🖨️ Print Payslip</button>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--slate-400); padding: 2rem;">No payslips generated yet.</div>`;
  }
}

// ==========================================
// PROMPT 5: PROFILE MANAGEMENT
// ==========================================

async function loadEmployeeProfile() {
  const res = await apiRequest('/api/v1/profile');
  if (res.ok) {
    const p = res.data.profile;
    document.getElementById('prof-view-name').textContent = p.full_name;
    document.getElementById('prof-view-job').textContent = `${p.job_title} • ${p.department} (Joined: ${p.joining_date})`;
    document.getElementById('prof-view-avatar').src = p.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    document.getElementById('prof-view-docs').href = p.documents_url || '#';
    document.getElementById('prof-view-salary-base').textContent = `$${p.salary_base.toFixed(2)}`;
    document.getElementById('prof-view-net-salary').textContent = `$${p.net_salary.toFixed(2)}`;

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
    loadEmployeeProfile();
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
window.handleContextUserChange = handleContextUserChange;
window.actionFlaggedAttendance = actionFlaggedAttendance;
window.promptEditEmployee = promptEditEmployee;
window.unlockEmployeeAccount = unlockEmployeeAccount;
window.actionLeave = actionLeave;
window.promptAdjustPayroll = promptAdjustPayroll;
window.setKioskLocationPreset = setKioskLocationPreset;
window.captureLiveGPS = captureLiveGPS;
window.executeKioskCheckIn = executeKioskCheckIn;
window.executeKioskCheckOut = executeKioskCheckOut;
window.setCalendarViewMode = setCalendarViewMode;
window.loadEmployeeCalendar = loadEmployeeCalendar;
window.submitLeaveApplication = submitLeaveApplication;
window.submitSelfProfileUpdate = submitSelfProfileUpdate;
window.openVerifyModal = openVerifyModal;
window.closeVerifyModal = closeVerifyModal;

document.addEventListener('DOMContentLoaded', initApp);
