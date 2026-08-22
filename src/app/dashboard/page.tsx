'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TopNav, Tab } from '@/components/dashboard/TopNav';
import { EmployeesTab } from '@/components/dashboard/EmployeesTab';
import { AttendanceTab } from '@/components/dashboard/AttendanceTab';
import { TimeOffTab } from '@/components/dashboard/TimeOffTab';
import { MainDashboardTab } from '@/components/dashboard/MainDashboardTab';
import { CheckInPanel } from '@/components/dashboard/CheckInPanel';
import { AdminPayrollTab } from '@/components/dashboard/AdminPayrollTab';
import { EmployeePayslipTab } from '@/components/dashboard/EmployeePayslipTab';
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
            {activeTab === 'payroll' && <AdminPayrollTab />}
            {activeTab === 'payslips' && <EmployeePayslipTab />}
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
        <aside className="w-72 shrink-0 border-l border-[var(--card-border)] bg-[var(--card)] p-4 hidden lg:block overflow-y-auto">
          <CheckInPanel />
        </aside>
      </div>
    </div>
  );
}
