'use client';

import React from 'react';
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

function FieldRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--card-border)] last:border-0">
      <span className="mt-0.5 text-[var(--text-muted)] shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{label}</p>
        <p className="text-sm text-[var(--foreground)] font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

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
              <FieldRow icon={<IdCard className="w-3.5 h-3.5" />} label="Employee ID" value={user.employee_id} />
              <FieldRow icon={<Mail className="w-3.5 h-3.5" />} label="Email Address" value={user.email} />
              <FieldRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.phone} />
              <FieldRow icon={<Building2 className="w-3.5 h-3.5" />} label="Department" value={user.department} />
              <FieldRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Job Title" value={user.job_title} />
              <FieldRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joining Date" value={user.joining_date} />
              <FieldRow icon={<User className="w-3.5 h-3.5" />} label="Company" value={user.company_name} />
            </div>

            {/* Footer badge */}
            <div className="px-6 pb-5 pt-2">
              <p className="text-center text-[10px] text-[var(--text-muted)] tracking-wide uppercase">
                View Only — Profile
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
