import { UserRole } from './auth';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'FLAGGED';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  locationStatus: 'VERIFIED' | 'OUTSIDE_GEOFENCE' | 'NO_SIGNAL';
  distanceMeters?: number;
  photoVerified: boolean;
}

export type LeaveType = 'PAID' | 'SICK' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
}

export interface LeaveBalance {
  paidUsed: number;
  paidTotal: number;
  sickUsed: number;
  sickTotal: number;
  unpaidUsed: number;
}

export interface PayslipItem {
  id: string;
  month: string;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'FINALIZED' | 'PROCESSING';
}

export interface DirectoryEmployee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  job_title: string;
  status: 'Active' | 'On leave' | 'Inactive';
  joining_date: string;
}
