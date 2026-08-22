import { JWTPayload, SignInCredentials, SignUpCredentials, StoredUser, User, UserRole } from '@/types/auth';
import { SEED_USERS } from './mock-data';

export const USERS_KEY = 'my_buddy_hrms_users_v4';
export const TOKEN_KEY = 'my_buddy_hrms_jwt_v4';
export const THEME_KEY = 'my_buddy_hrms_theme';

export function initLocalStore(): void {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(USERS_KEY);
  if (!existing) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  }
}

export function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return SEED_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : SEED_USERS;
  } catch {
    return SEED_USERS;
  }
}

export function createJWT(user: User): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: JWTPayload = {
    user_id: user.user_id,
    company_name: user.company_name,
    employee_id: user.employee_id,
    first_name: user.first_name,
    last_name: user.last_name,
    name: user.name || `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 * 24, // 24 hours
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'sig_my_buddy_hrms_v4';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function parseJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = atob(parts[1]);
    const payload: JWTPayload = JSON.parse(payloadJson);
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function loginUser(credentials: SignInCredentials): Promise<{ user: User; token: string }> {
  initLocalStore();
  const users = getStoredUsers();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === credentials.email.trim().toLowerCase() &&
      u.password === credentials.password
  );

  if (!user) {
    throw new Error('Invalid Login ID/Email or password credentials.');
  }

  const { password, ...safeUser } = user;
  const token = createJWT(safeUser);
  setStoredToken(token);

  return { user: safeUser, token };
}

export async function registerUser(credentials: SignUpCredentials): Promise<{ user: User; token: string }> {
  initLocalStore();
  const users = getStoredUsers();

  if (users.some((u) => u.email.toLowerCase() === credentials.email.trim().toLowerCase())) {
    throw new Error(`Email address ${credentials.email} is already registered.`);
  }

  // Parse name into first and last name
  const nameParts = credentials.name.trim().split(' ');
  const first_name = nameParts[0] || 'User';
  const last_name = nameParts.slice(1).join(' ') || '';

  const employee_id =
    credentials.employee_id ||
    `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const role: UserRole = credentials.role || 'HR_ADMIN'; // Sign up creates company admin by default or specified

  const newUser: StoredUser = {
    user_id: `usr_${Date.now().toString().slice(-6)}`,
    company_name: credentials.company_name.trim(),
    company_logo: credentials.company_logo,
    employee_id,
    first_name,
    last_name,
    name: credentials.name.trim(),
    email: credentials.email.trim().toLowerCase(),
    phone: credentials.phone?.trim() || '',
    password: credentials.password,
    role,
    department: role === 'HR_ADMIN' ? 'Executive / People Operations' : 'Product Engineering',
    job_title: role === 'HR_ADMIN' ? 'Administrator' : 'Specialist',
    joining_date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const { password, ...safeUser } = newUser;
  const token = createJWT(safeUser);
  setStoredToken(token);

  return { user: safeUser, token };
}

export function getRedirectPathForRole(_role: UserRole): string {
  return '/dashboard';
}
