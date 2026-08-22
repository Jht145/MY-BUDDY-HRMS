'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Camera, CalendarDays, FileText, CheckCircle2, Bell, AlertTriangle, UserCheck, Clock, Plane
} from 'lucide-react';

interface MainDashboardTabProps {
  onNavigateToTab: (tab: 'employees' | 'attendance' | 'timeoff') => void;
}

export function MainDashboardTab({ onNavigateToTab }: MainDashboardTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  // State to simulate action handling locally
  const [approvedRequests, setApprovedRequests] = useState<string[]>([]);
  const [reviewedCheckins, setReviewedCheckins] = useState<string[]>([]);

  if (!user) return null;

  if (isAdmin) {
    // HR Admin Dashboard View
    return (
      <div className="space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-[var(--brand-teal)] uppercase">HR Admin Portal</p>
            <h1 className="text-2xl font-black text-[var(--foreground)] mt-1">
              Welcome, {user.first_name || 'Admin'}.
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Monitor workforce health, exceptions, and approvals.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('employees')}
            className="h-9 px-4 bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Manage Employees
          </button>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Active workforce" value="248" detail="+8 this month" />
          <StatCard title="Present today" value="213" detail="86% attendance" color="text-emerald-500" />
          <StatCard title="Pending leaves" value="12" detail="Needs review" color="text-amber-500" />
          <StatCard title="Flagged check-ins" value="04" detail="Outside geofence" color="text-red-500" />
        </div>

        {/* 2-Column Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Flagged Check-ins */}
          <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-sm text-[var(--foreground)]">Flagged location check-ins</h2>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">View all</span>
            </div>
            <div className="space-y-3.5">
              {[
                { name: 'Rohan Mehta', time: '08:57 AM', note: '128m from permitted location' },
                { name: 'Fatima Ali', time: '09:06 AM', note: 'No location signal' },
                { name: 'Arjun Das', time: '09:18 AM', note: 'Camera image needs review' },
              ].map((item) => (
                <div key={item.name} className="flex items-start gap-3 rounded-lg border border-[var(--card-border)] p-3 bg-[var(--background)]/30">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/10 font-bold text-xs text-amber-500 shrink-0">
                    {item.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[var(--foreground)]">{item.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.time} · {item.note}</p>
                  </div>
                  <button
                    onClick={() => setReviewedCheckins((prev) => [...prev, item.name])}
                    disabled={reviewedCheckins.includes(item.name)}
                    className="rounded-md border border-[var(--card-border)] px-2.5 py-1 text-[10px] font-bold hover:border-[var(--brand-teal)] text-[var(--foreground)] disabled:opacity-40 disabled:cursor-default"
                  >
                    {reviewedCheckins.includes(item.name) ? 'Reviewed' : 'Review'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Leave approval queue */}
          <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-sm text-[var(--foreground)]">Leave approval queue</h2>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">12 pending</span>
            </div>
            <div className="space-y-3.5">
              {[
                { id: '1', name: 'Priya Nair', note: 'Paid leave · Aug 26–27' },
                { id: '2', name: 'Dev Kumar', note: 'Sick leave · Aug 23' },
                { id: '3', name: 'Nisha Roy', note: 'Unpaid leave · Aug 29–31' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-500/10 font-bold text-xs text-blue-500 shrink-0">
                      {item.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[var(--foreground)]">{item.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.note}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setApprovedRequests((prev) => [...prev, item.id])}
                    disabled={approvedRequests.includes(item.id)}
                    className="rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-500 disabled:opacity-40 disabled:cursor-default"
                  >
                    {approvedRequests.includes(item.id) ? 'Approved ✓' : 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Workforce Attendance metrics */}
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h2 className="font-bold text-sm text-[var(--foreground)] mb-4">Workforce attendance overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="On-time arrivals" value="78%" detail="Above weekly average" color="text-emerald-500" />
            <StatCard title="Late arrivals" value="11%" detail="27 employees" color="text-amber-500" />
            <StatCard title="Absent" value="3%" detail="8 employees" color="text-red-500" />
          </div>
        </section>
      </div>
    );
  }

  // Employee Dashboard View
  const firstName = user.first_name || 'User';

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider text-[var(--brand-teal)] uppercase">Employee Portal</p>
          <h1 className="text-2xl font-black text-[var(--foreground)] mt-1">
            Good day, {firstName}.
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Here is your workday summary at a glance.
          </p>
        </div>
      </div>

      {/* 4 Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today’s status" value="Present" detail="Checked in at 09:12 AM" color="text-emerald-500" />
        <StatCard title="Hours logged" value="06h 18m" detail="Target: 08h 00m" />
        <StatCard title="Leave balance" value="14 days" detail="Paid leave available" />
        <StatCard title="Pending request" value="01" detail="Sick leave · under review" />
      </div>

      {/* 2-Column Section */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Attendance Activity bar chart */}
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-sm text-[var(--foreground)]">Attendance activity</h2>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">This week</span>
          </div>
          <div className="space-y-4">
            {[
              { day: 'Mon', width: '100%', val: '8h 12m' },
              { day: 'Tue', width: '100%', val: '8h 05m' },
              { day: 'Wed', width: '92%', val: '7h 38m' },
              { day: 'Thu', width: '78%', val: '6h 18m' },
              { day: 'Fri', width: '60%', val: 'In progress' },
            ].map((d) => (
              <div key={d.day} className="flex items-center gap-4">
                <span className="w-8 text-xs font-bold text-[var(--foreground)]">{d.day}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--input-bg)] border border-[var(--card-border)]">
                  <div className="h-full rounded-full bg-[var(--brand-teal)]" style={{ width: d.width }} />
                </div>
                <span className="w-16 text-right text-xs text-[var(--text-muted)]">{d.val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-sm text-[var(--foreground)] mb-4">Quick actions</h2>
            <div className="grid gap-3">
              <QuickAction
                icon={<Camera className="w-4 h-4 text-[var(--brand-teal)]" />}
                title="Kiosk attendance"
                text="Verify camera & GPS"
                onClick={() => onNavigateToTab('attendance')}
              />
              <QuickAction
                icon={<CalendarDays className="w-4 h-4 text-[var(--brand-teal)]" />}
                title="Apply for leave"
                text="Submit time-off request"
                onClick={() => onNavigateToTab('timeoff')}
              />
              <QuickAction
                icon={<FileText className="w-4 h-4 text-[var(--brand-teal)]" />}
                title="View payslips"
                text="Review payroll history"
                onClick={() => onNavigateToTab('attendance')}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activity logs */}
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="font-bold text-sm text-[var(--foreground)] mb-4">Recent activity</h2>
        <div className="divide-y divide-[var(--card-border)]">
          {[
            { msg: 'You checked in using Smart Kiosk', time: 'Today · 09:12 AM', icon: <UserCheck className="w-4 h-4 text-emerald-500" /> },
            { msg: 'Leave request sent for review', time: 'Yesterday', icon: <Clock className="w-4 h-4 text-amber-500" /> },
            { msg: 'July payslip is now available', time: 'August 01', icon: <Bell className="w-4 h-4 text-[var(--brand-teal)]" /> },
          ].map((act, index) => (
            <div key={index} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="rounded-full bg-[var(--input-bg)] p-2 border border-[var(--card-border)] shrink-0">
                {act.icon}
              </div>
              <div>
                <p className="font-semibold text-xs text-[var(--foreground)]">{act.msg}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, detail, color = 'text-[var(--foreground)]' }: { title: string; value: string; detail: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 select-none shadow-sm hover:border-[var(--brand-teal)]/30 transition-colors">
      <p className="text-xs font-semibold text-[var(--text-muted)]">{title}</p>
      <p className={`mt-2 text-2xl font-black ${color} tracking-tight`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function QuickAction({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 text-left hover:border-[var(--brand-teal)] transition-all cursor-pointer w-full hover:shadow-sm"
    >
      <div className="rounded-lg bg-teal-500/10 p-2 border border-[var(--brand-teal)]/10 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-xs text-[var(--foreground)]">{title}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{text}</p>
      </div>
    </button>
  );
}
