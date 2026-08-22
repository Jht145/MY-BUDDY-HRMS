'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopNav, Tab } from '@/components/dashboard/TopNav';
import { EmployeesTab } from '@/components/dashboard/EmployeesTab';
import { AttendanceTab } from '@/components/dashboard/AttendanceTab';
import { TimeOffTab } from '@/components/dashboard/TimeOffTab';
import { MainDashboardTab } from '@/components/dashboard/MainDashboardTab';
import { EmployeePayslipTab } from '@/components/dashboard/EmployeePayslipTab';
import { AdminPayrollTab } from '@/components/dashboard/AdminPayrollTab';
import { CheckInPanel } from '@/components/dashboard/CheckInPanel';
import { Settings } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-5 h-5 border-2 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user.role === 'HR_ADMIN';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      {/* Top Navigation */}
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main layout: content + right panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 p-5 sm:p-6">
            {activeTab === 'dashboard' && <MainDashboardTab onNavigateToTab={setActiveTab} />}
            {activeTab === 'employees' && <EmployeesTab />}
            {activeTab === 'attendance' && <AttendanceTab />}
            {activeTab === 'timeoff' && <TimeOffTab />}
            {activeTab === 'payroll' && (isAdmin ? <AdminPayrollTab /> : <EmployeePayslipTab />)}
          </div>

          {/* Settings link — bottom of content area */}
          <div className="px-5 sm:px-6 pb-4 border-t border-[var(--card-border)]">
            <button className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer py-3">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </main>

        {/* Right panel: Check In/Out */}
        <aside className="hidden md:flex w-60 shrink-0 border-l border-[var(--card-border)] flex-col p-5 gap-5 bg-[var(--card)]/50">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-bold text-[var(--text-muted)] mb-4">Attendance</p>
            <CheckInPanel />
          </div>

          {/* Employee info summary */}
          <div className="border-t border-[var(--card-border)] pt-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">Signed in as</p>
            <p className="text-xs font-bold text-[var(--foreground)] truncate">
              {user.name || `${user.first_name} ${user.last_name}`.trim()}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{user.employee_id}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              user.role === 'HR_ADMIN'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
            }`}>
              {user.role === 'HR_ADMIN' ? 'HR Admin' : 'Employee'}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
