'use client';

import React, { useEffect, useRef } from 'react';
import { X, Mail, Phone, Briefcase, Building2, Calendar, IdCard, Plane } from 'lucide-react';
import { AttendanceStatus } from '@/types/auth';

interface EmployeeDetail {
  user_id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  employee_id: string;
  department?: string;
  job_title?: string;
  joining_date?: string;
  role: string;
  attendance_status?: AttendanceStatus;
}

interface EmployeeDetailModalProps {
  employee: EmployeeDetail | null;
  onClose: () => void;
}

function getInitials(emp: EmployeeDetail): string {
  const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-teal-500', 'bg-purple-500', 'bg-blue-500', 'bg-orange-400',
  'bg-pink-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-cyan-500',
];

function getAvatarColor(id: string): string {
  const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ON_LEAVE: 'On Leave',
  ABSENT: 'Absent',
};

export function EmployeeDetailModal({ employee, onClose }: EmployeeDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!employee) return null;

  const displayName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  const status = employee.attendance_status || 'ABSENT';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with avatar */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6 border-b border-[var(--card-border)] gap-3">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${getAvatarColor(employee.user_id)}`}>
            {getInitials(employee)}
          </div>
          <div className="text-center">
            <p className="font-bold text-base text-[var(--foreground)]">{displayName}</p>
            {employee.job_title && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{employee.job_title}</p>
            )}
            {/* Status badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
              border
              bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-muted)]">
              {status === 'ON_LEAVE' ? (
                <Plane className="w-3 h-3 text-sky-400" />
              ) : status === 'PRESENT' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
              <span>{STATUS_LABELS[status]}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-3">
          <DetailRow icon={<IdCard className="w-3.5 h-3.5" />} label="Employee ID" value={employee.employee_id} />
          <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={employee.email} />
          {employee.phone && <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={employee.phone} />}
          {employee.department && <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Department" value={employee.department} />}
          {employee.job_title && <DetailRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Job Title" value={employee.job_title} />}
          {employee.joining_date && <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joining Date" value={employee.joining_date} />}
          <DetailRow
            icon={<span className="w-3.5 h-3.5 text-[10px] font-bold flex items-center justify-center">R</span>}
            label="Role"
            value={employee.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}
          />
        </div>

        {/* View-only badge */}
        <div className="px-6 pb-5">
          <p className="text-center text-[10px] text-[var(--text-muted)] tracking-wide uppercase">
            View Only — Non-Editable
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[var(--text-muted)] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{label}</p>
        <p className="text-sm text-[var(--foreground)] font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
