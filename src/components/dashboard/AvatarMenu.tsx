'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function getInitials(name: string): string {
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

export function AvatarMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer transition-opacity hover:opacity-90 ${user ? getAvatarColor(user.user_id) : 'bg-[var(--brand-teal)]'}`}
        aria-label="Open profile menu"
      >
        {getInitials(displayName)}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-44 bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b border-[var(--card-border)]">
            <p className="text-xs font-semibold text-[var(--foreground)] truncate">{displayName}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}</p>
          </div>
          <button
            onClick={() => { setOpen(false); router.push('/dashboard/profile'); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            My Profile
          </button>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/8 transition-colors cursor-pointer border-t border-[var(--card-border)]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
