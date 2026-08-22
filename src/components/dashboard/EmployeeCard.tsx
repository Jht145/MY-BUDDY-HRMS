'use client';

import React from 'react';
import { Plane } from 'lucide-react';
import { AttendanceStatus } from '@/types/auth';

interface EmployeeCardProps {
  user_id: string;
  name: string;
  job_title?: string;
  department?: string;
  attendance_status?: AttendanceStatus;
  onClick?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-teal-500',
  'bg-purple-500',
  'bg-blue-500',
  'bg-orange-400',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function getAvatarColor(id: string): string {
  const index =
    id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function EmployeeCard({
  user_id,
  name,
  job_title,
  department,
  attendance_status = 'ABSENT',
  onClick,
}: EmployeeCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-4 cursor-pointer hover:border-[var(--brand-teal)] hover:shadow-lg transition-all select-none"
    >
      {/* Status Indicator — top-right */}
      <div className="absolute top-3 right-3">
        {attendance_status === 'ON_LEAVE' ? (
          <Plane className="w-3.5 h-3.5 text-sky-400" />
        ) : attendance_status === 'PRESENT' ? (
          <span className="block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
        ) : (
          <span className="block w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18)]" />
        )}
      </div>

      {/* Avatar */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base mb-3 mx-auto ${getAvatarColor(user_id)}`}
      >
        {getInitials(name)}
      </div>

      {/* Info */}
      <div className="text-center space-y-0.5">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{name}</p>
        {job_title && (
          <p className="text-[11px] text-[var(--text-muted)] truncate">{job_title}</p>
        )}
        {department && (
          <p className="text-[10px] text-[var(--text-muted)]/60 truncate">{department}</p>
        )}
      </div>
    </div>
  );
}
