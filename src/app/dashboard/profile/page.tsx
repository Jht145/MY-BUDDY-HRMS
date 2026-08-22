'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import {
  Mail, Phone, Briefcase, Building2, Calendar, IdCard, ArrowLeft, User
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-teal-500', 'bg-purple-500', 'bg-blue-500', 'bg-orange-400',
  'bg-pink-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-cyan-500',
];
function getAvatarColor(id: string): string {
  const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function FieldRow({ icon, label, value, isEditing, onChange }: { icon: React.ReactNode; label: string; value?: string; isEditing?: boolean; onChange?: (val: string) => void }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--card-border)] last:border-0">
      <span className="mt-0.5 text-[var(--text-muted)] shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{label}</p>
        {isEditing && onChange ? (
          <input 
            type="text" 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-0.5 h-8 px-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded outline-none text-[var(--foreground)] focus:border-[var(--brand-teal)]"
          />
        ) : (
          <p className="text-sm text-[var(--foreground)] font-medium mt-0.5">{value || '-'}</p>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditData({ ...user });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      const res = await fetch(`/api/v1/profile/self`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          phone: editData.phone
        })
      });
      if (res.ok) setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  if (!user) {
    return null;
  }

  const displayName = user.name || `${user.first_name} ${user.last_name}`.trim();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--card-border)]">
        <div className="flex items-center justify-between px-5 sm:px-6 h-14">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>

          {/* Profile card */}
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-lg">
            {/* Avatar header */}
            <div className="flex flex-col items-center pt-8 pb-6 px-6 gap-3 border-b border-[var(--card-border)] bg-[var(--input-bg)]">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${getAvatarColor(user.user_id)}`}>
                {getInitials(displayName)}
              </div>
              <div className="text-center">
                <p className="font-bold text-base text-[var(--foreground)]">{displayName}</p>
                {user.job_title && <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.job_title}</p>}
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  user.role === 'HR_ADMIN'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                }`}>
                  {user.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}
                </span>
              </div>
            </div>

            {/* Fields */}
            <div className="px-6 py-2">
              <FieldRow icon={<IdCard className="w-3.5 h-3.5" />} label="Employee ID" value={editData.employee_id} />
              <FieldRow icon={<Mail className="w-3.5 h-3.5" />} label="Email Address" value={editData.email} />
              <FieldRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={editData.phone} isEditing={isEditing} onChange={(v) => setEditData({...editData, phone: v})} />
              <FieldRow icon={<Building2 className="w-3.5 h-3.5" />} label="Department" value={editData.department} />
              <FieldRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Job Title" value={editData.job_title} />
              <FieldRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joining Date" value={editData.joining_date} />
              <FieldRow icon={<User className="w-3.5 h-3.5" />} label="Company" value={editData.company_name} />
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-2 flex justify-end gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--input-bg)] rounded-lg transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm bg-[var(--brand-teal)] text-white rounded-lg transition-colors shadow-sm">{isSaving ? 'Saving...' : 'Save Profile'}</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="w-full py-2.5 text-sm bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] rounded-lg transition-colors border border-[var(--card-border)] shadow-sm font-medium">
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
