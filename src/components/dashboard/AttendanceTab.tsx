'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface AttendanceRecord {
  date: string;
  checkIn: number | null;
  checkOut: number | null;
}

const CHECKIN_KEY = (userId: string) => `my_buddy_hrms_checkin_${userId}`;
const HISTORY_KEY = (userId: string) => `my_buddy_hrms_attendance_history_${userId}`;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(checkIn: number, checkOut: number): string {
  const ms = checkOut - checkIn;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AttendanceTab() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load history
    const historyRaw = localStorage.getItem(HISTORY_KEY(user.user_id));
    const history: AttendanceRecord[] = historyRaw ? JSON.parse(historyRaw) : [];

    // Check today's record
    const todayRaw = localStorage.getItem(CHECKIN_KEY(user.user_id));
    const today = new Date().toISOString().slice(0, 10);
    let todayRecord: AttendanceRecord | null = null;
    if (todayRaw) {
      try {
        const parsed = JSON.parse(todayRaw);
        if (parsed.date === today) {
          todayRecord = { date: today, checkIn: parsed.timestamp, checkOut: null };
        }
      } catch { /* ignore */ }
    }

    // Merge
    const all = todayRecord
      ? [todayRecord, ...history.filter((r) => r.date !== today)]
      : history;

    // Add demo past records if no history
    if (all.length === 0) {
      const mockRecords: AttendanceRecord[] = [];
      for (let i = 1; i <= 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const checkIn = d.setHours(9, Math.floor(Math.random() * 30), 0, 0);
        const checkOut = checkIn + (8 + Math.random()) * 3600000;
        mockRecords.push({ date: dateStr, checkIn, checkOut });
      }
      setRecords(mockRecords);
    } else {
      setRecords(all);
    }
  }, [user]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold text-[var(--foreground)]">Attendance Log</h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Your check-in and check-out history</p>
      </div>

      <div className="rounded-xl border border-[var(--card-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--input-bg)] text-[var(--text-muted)] text-[11px] uppercase tracking-wide">
              <th className="text-left px-4 py-2.5 font-semibold">Date</th>
              <th className="text-left px-4 py-2.5 font-semibold">Check In</th>
              <th className="text-left px-4 py-2.5 font-semibold">Check Out</th>
              <th className="text-left px-4 py-2.5 font-semibold">Duration</th>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-[var(--text-muted)] text-xs">
                  No attendance records found
                </td>
              </tr>
            )}
            {records.map((rec, i) => {
              const hasCheckOut = !!rec.checkOut;
              return (
                <tr key={i} className="bg-[var(--card)] hover:bg-[var(--input-bg)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)] text-xs">{formatDate(rec.date)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--foreground)]">
                    {rec.checkIn ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[var(--brand-teal)]" />
                        {formatTime(rec.checkIn)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--foreground)]">
                    {rec.checkOut ? formatTime(rec.checkOut) : (
                      <span className="text-[var(--text-muted)] italic">In progress</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--foreground)]">
                    {rec.checkIn && rec.checkOut ? formatDuration(rec.checkIn, rec.checkOut) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {hasCheckOut ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                        <CheckCircle2 className="w-3 h-3" /> Present
                      </span>
                    ) : rec.checkIn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-teal)]">
                        <Clock className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                        <XCircle className="w-3 h-3" /> Absent
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
