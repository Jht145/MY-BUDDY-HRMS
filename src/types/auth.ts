export type UserRole = 'EMPLOYEE' | 'HR_ADMIN';
export type AttendanceStatus = 'PRESENT' | 'ON_LEAVE' | 'ABSENT';

export interface User {
  user_id: string;
  company_name: string;
  company_logo?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  job_title?: string;
  joining_date?: string;
  avatar_url?: string;
  attendance_status?: AttendanceStatus;
}

export interface StoredUser extends User {
  password?: string;
}

export interface JWTPayload {
  user_id: string;
  company_name: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  company_name: string;
  company_logo?: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirm_password?: string;
  employee_id?: string;
  role?: UserRole;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
