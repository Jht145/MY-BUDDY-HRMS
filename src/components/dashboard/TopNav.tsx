'use client';

import React from 'react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { AvatarMenu } from './AvatarMenu';
import { useAuth } from '@/context/AuthContext';

export type Tab = 'dashboard' | 'employees' | 'attendance' | 'timeoff' | 'payroll';

interface TopNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'employees', label: 'Employees' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'timeoff', label: 'Time Off' },
    { id: 'payroll', label: isAdmin ? 'Payroll' : 'Payslips' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--card-border)]">
      <div className="flex items-center justify-between px-5 sm:px-6 h-14">
        {/* Left: Logo */}
        <div className="shrink-0">
          <BrandLogo size="sm" />
        </div>

        {/* Center: Tabs */}
        <nav className="flex items-center gap-1 bg-[var(--input-bg)] rounded-lg p-1 border border-[var(--card-border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--brand-teal)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Theme toggle + Avatar */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}
