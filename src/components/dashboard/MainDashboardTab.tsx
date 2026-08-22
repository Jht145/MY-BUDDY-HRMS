'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AttendanceKioskModal } from './AttendanceKioskModal';
import {
  Camera, CalendarDays, FileText, CheckCircle2, Bell, AlertTriangle, UserCheck, Clock, Plane, X, ShieldAlert, Check, Ban
} from 'lucide-react';

interface MainDashboardTabProps {
  onNavigateToTab: (tab: 'employees' | 'attendance' | 'timeoff') => void;
}

interface FlaggedCheckin {
  name: string;
  time: string;
  note: string;
  coordinates: string;
  empId: string;
  department: string;
  photo?: string;
}

interface LeaveRequest {
  id: string;
  name: string;
  empId: string;
  department: string;
  email: string;
  type: string;
  dates: string;
  days: number;
  reason: string;
}

export function MainDashboardTab({ onNavigateToTab }: MainDashboardTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'HR_ADMIN';

  // Modal States
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [kioskMode, setKioskMode] = useState<'checkin' | 'checkout'>('checkin');
  const [isFlaggedViewAllOpen, setIsFlaggedViewAllOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedFlagged, setSelectedFlagged] = useState<FlaggedCheckin | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Simulated Action State Lists
  const [approvedRequests, setApprovedRequests] = useState<string[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<string[]>([]);
  const [reviewedCheckins, setReviewedCheckins] = useState<string[]>([]);
  const [rejectedCheckins, setRejectedCheckins] = useState<string[]>([]);

  // Dynamic flagged check-ins state
  const [flaggedLogs, setFlaggedLogs] = useState<FlaggedCheckin[]>([]);

  // Load local storage flagged check-ins on mount & kiosk update
  const loadFlaggedLogs = () => {
    const mockCheckins: FlaggedCheckin[] = [
      { name: 'Rohan Mehta', time: '08:57 AM', note: '128m from permitted location', coordinates: '12.9729, 77.5958', empId: 'EMP-1043', department: 'Operations' },
      { name: 'Fatima Ali', time: '09:06 AM', note: 'No location signal', coordinates: 'Unknown / Blocked', empId: 'EMP-1044', department: 'Finance' },
      { name: 'Arjun Das', time: '09:18 AM', note: 'Camera image needs review', coordinates: '12.9716, 77.5946', empId: 'EMP-1045', department: 'Customer Success' },
      { name: 'Dev Vashisht', time: '09:30 AM', note: 'Kiosk Geofence Bypass Warning', coordinates: '13.0827, 80.2707', empId: 'EMP-1088', department: 'Product Engineering' },
    ];
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('my_buddy_hrms_flagged_checkins');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setFlaggedLogs([...parsed, ...mockCheckins]);
          return;
        } catch { /* ignore */ }
      }
    }
    setFlaggedLogs(mockCheckins);
  };

  useEffect(() => {
    loadFlaggedLogs();
    if (typeof window !== 'undefined' && user) {
      const raw = localStorage.getItem(`my_buddy_hrms_checkin_${user.user_id}`);
      setIsCheckedIn(!!raw);
    }
  }, [isKioskOpen, user]);

  if (!user) return null;

  const leaveRequests: LeaveRequest[] = [
    { id: '1', name: 'Priya Nair', empId: 'EMP-1042', department: 'Product Engineering', email: 'priya.nair@mybuddy.com', type: 'Paid Leave', dates: 'Aug 26–27', days: 2, reason: 'Family wedding event celebration with relatives.' },
    { id: '2', name: 'Dev Kumar', empId: 'EMP-1048', department: 'Product Engineering', email: 'dev.kumar@mybuddy.com', type: 'Sick Leave', dates: 'Aug 23', days: 1, reason: 'High fever and doctor-advised rest.' },
    { id: '3', name: 'Nisha Roy', empId: 'EMP-1055', department: 'Marketing', email: 'nisha.roy@mybuddy.com', type: 'Unpaid Leave', dates: 'Aug 29–31', days: 3, reason: 'Personal family emergency travel.' },
  ];

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
          <div className="flex gap-2">
            <button
              onClick={() => onNavigateToTab('employees')}
              className="h-9 px-4 bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Manage Employees
            </button>
          </div>
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
              <button
                type="button"
                onClick={() => setIsFlaggedViewAllOpen(true)}
                className="text-[10px] uppercase font-bold text-[var(--brand-teal)] hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>
            <div className="space-y-3.5">
              {flaggedLogs.slice(0, 3).map((item, index) => {
                const uniqueKey = `${item.name}-${index}`;
                const isApproved = reviewedCheckins.includes(uniqueKey);
                const isRejected = rejectedCheckins.includes(uniqueKey);
                return (
                  <div key={uniqueKey} className="flex items-start gap-3 rounded-lg border border-[var(--card-border)] p-3 bg-[var(--background)]/30">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/10 font-bold text-xs text-amber-500 shrink-0">
                      {item.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-[var(--foreground)]">{item.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.time} · {item.note}</p>
                    </div>
                    {isApproved || isRejected ? (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {isApproved ? 'Approved ✓' : 'Rejected ✗'}
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedFlagged(item)}
                        className="rounded-md border border-[var(--card-border)] px-2.5 py-1 text-[10px] font-bold hover:border-[var(--brand-teal)] text-[var(--foreground)] transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Leave approval queue */}
          <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-sm text-[var(--foreground)]">Leave approval queue</h2>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">3 pending</span>
            </div>
            <div className="space-y-3.5">
              {leaveRequests.map((item) => {
                const isApproved = approvedRequests.includes(item.id);
                const isRejected = rejectedRequests.includes(item.id);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-1">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-500/10 font-bold text-xs text-blue-500 shrink-0">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[var(--foreground)]">{item.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.type} · {item.dates}</p>
                      </div>
                    </div>
                    {isApproved || isRejected ? (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {isApproved ? 'Approved ✓' : 'Rejected ✗'}
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedLeave(item)}
                        className="rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-500 transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                );
              })}
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

        {/* MODAL 1: View All Flagged Checkins */}
        {isFlaggedViewAllOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden">
              <button onClick={() => setIsFlaggedViewAllOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)]"><X className="w-4 h-4" /></button>
              <div className="p-5 border-b border-[var(--card-border)] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Flagged Location Logs</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Complete review queue for out-of-bounds check-ins</p>
                </div>
              </div>
              <div className="p-5 max-h-[350px] overflow-y-auto space-y-3">
                {flaggedLogs.map((item, index) => {
                  const uniqueKey = `${item.name}-${index}`;
                  const isApproved = reviewedCheckins.includes(uniqueKey);
                  const isRejected = rejectedCheckins.includes(uniqueKey);
                  return (
                    <div key={uniqueKey} className="flex items-center justify-between p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)]">
                      <div>
                        <p className="text-xs font-bold text-[var(--foreground)]">{item.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.time} · {item.note}</p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-1 font-mono">Coords: {item.coordinates}</p>
                      </div>
                      {isApproved || isRejected ? (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                          isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {isApproved ? 'Approved ✓' : 'Rejected ✗'}
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedFlagged(item)}
                          className="rounded-lg bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-teal-hover)] px-3 py-1 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Review Flagged Checkin Details */}
        {selectedFlagged && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden p-5">
              <button onClick={() => setSelectedFlagged(null)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)] z-10"><X className="w-4 h-4" /></button>
              
              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-5">
                {/* Left Column: Photograph */}
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Webcam Evidence Snapshot</p>
                  <div className="relative flex-1 min-h-[220px] rounded-xl border border-[var(--card-border)] overflow-hidden bg-black flex items-center justify-center">
                    {selectedFlagged.photo ? (
                      <img
                        src={selectedFlagged.photo}
                        alt="Captured kiosk snapshot evidence"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)] gap-2">
                        <Camera className="w-8 h-8 opacity-30" />
                        <span className="text-[10px] font-bold">No live snapshot captured</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Details & Actions */}
                <div className="flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5 border-b border-[var(--card-border)] pb-2">
                      <ShieldAlert className="w-4 h-4" /> Review Check-in Exception
                    </h3>
                    
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Employee Details</p>
                        <p className="font-bold text-[var(--foreground)] mt-0.5">{selectedFlagged.name} ({selectedFlagged.empId})</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{selectedFlagged.department}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Capture Telemetry</p>
                        <p className="font-bold text-[var(--foreground)] mt-0.5">Time: {selectedFlagged.time}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-semibold text-amber-500">Flag reason: {selectedFlagged.note}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono">Coordinates: {selectedFlagged.coordinates}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => {
                        const uniqueKey = flaggedLogs.findIndex(f => f.name === selectedFlagged.name);
                        setReviewedCheckins((prev) => [...prev, `${selectedFlagged.name}-${uniqueKey !== -1 ? uniqueKey : 0}`]);
                        setSelectedFlagged(null);
                      }}
                      className="flex-1 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const uniqueKey = flaggedLogs.findIndex(f => f.name === selectedFlagged.name);
                        setRejectedCheckins((prev) => [...prev, `${selectedFlagged.name}-${uniqueKey !== -1 ? uniqueKey : 0}`]);
                        setSelectedFlagged(null);
                      }}
                      className="flex-1 h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Leave Approval Floating Window */}
        {selectedLeave && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="relative w-full max-w-sm bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl p-5">
              <button onClick={() => setSelectedLeave(null)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)]"><X className="w-4 h-4" /></button>
              
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--brand-teal)] flex items-center gap-1.5 mb-4">
                <Plane className="w-4 h-4" /> Leave Request Approval
              </h3>

              <div className="space-y-3.5 text-xs">
                {/* Employee info */}
                <div>
                  <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Employee Info</p>
                  <p className="font-bold text-[var(--foreground)] mt-0.5">{selectedLeave.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{selectedLeave.empId} · {selectedLeave.department}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{selectedLeave.email}</p>
                </div>
                {/* Leave details */}
                <div>
                  <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Leave Details</p>
                  <p className="font-bold text-[var(--foreground)] mt-0.5">{selectedLeave.type} ({selectedLeave.days} Day{selectedLeave.days !== 1 ? 's' : ''})</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Period: {selectedLeave.dates}</p>
                </div>
                {/* Leave reason */}
                <div>
                  <p className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Leave Reason</p>
                  <p className="text-xs text-[var(--foreground)] bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg p-2.5 mt-1 leading-relaxed">
                    {selectedLeave.reason}
                  </p>
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => {
                    setApprovedRequests((prev) => [...prev, selectedLeave.id]);
                    setSelectedLeave(null);
                  }}
                  className="flex-1 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => {
                    setRejectedRequests((prev) => [...prev, selectedLeave.id]);
                    setSelectedLeave(null);
                  }}
                  className="flex-1 h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shared smart kiosk modal */}
        <AttendanceKioskModal isOpen={isKioskOpen} onClose={() => setIsKioskOpen(false)} mode={kioskMode} />
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
                title={isCheckedIn ? 'Kiosk Check-Out' : 'Kiosk Check-In'}
                text="Verify camera & GPS"
                onClick={() => {
                  setKioskMode(isCheckedIn ? 'checkout' : 'checkin');
                  setIsKioskOpen(true);
                }}
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

      {/* Shared smart kiosk modal */}
      <AttendanceKioskModal isOpen={isKioskOpen} onClose={() => setIsKioskOpen(false)} mode={kioskMode} />
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
