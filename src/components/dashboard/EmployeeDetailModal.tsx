'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setEditData({ ...employee });
    }
  }, [employee]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      const res = await fetch(`/api/v1/profile/admin/${employee.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          phone: editData.phone,
          department: editData.department,
          job_title: editData.job_title
        })
      });
      if (res.ok) {
        setIsEditing(false);
        onClose(); // Close to force refresh since state is lifted up
      }
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

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
          <DetailRow icon={<IdCard className="w-3.5 h-3.5" />} label="Employee ID" value={editData.employee_id || ''} />
          <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={editData.email || ''} />
          <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={editData.phone || ''} isEditing={isEditing} onChange={(v) => setEditData({...editData, phone: v})} />
          <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Department" value={editData.department || ''} isEditing={isEditing} onChange={(v) => setEditData({...editData, department: v})} />
          <DetailRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Job Title" value={editData.job_title || ''} isEditing={isEditing} onChange={(v) => setEditData({...editData, job_title: v})} />
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joining Date" value={editData.joining_date || ''} />
          <DetailRow
            icon={<span className="w-3.5 h-3.5 text-[10px] font-bold flex items-center justify-center">R</span>}
            label="Role"
            value={editData.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}
          />
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--input-bg)] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-xs font-semibold bg-[var(--brand-teal)] text-white rounded-lg transition-colors shadow-sm">{isSaving ? 'Saving...' : 'Save Changes'}</button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="w-full py-2.5 text-xs font-semibold bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] rounded-lg transition-colors border border-[var(--card-border)] shadow-sm">
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, isEditing, onChange }: { icon: React.ReactNode; label: string; value: string; isEditing?: boolean; onChange?: (val: string) => void }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[var(--text-muted)] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{label}</p>
        {isEditing && onChange ? (
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-0.5 h-7 px-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded outline-none text-[var(--foreground)] focus:border-[var(--brand-teal)]"
          />
        ) : (
          <p className="text-sm text-[var(--foreground)] font-medium truncate">{value || '-'}</p>
        )}
      </div>
    </div>
  );
}
