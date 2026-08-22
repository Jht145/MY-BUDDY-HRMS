'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { INITIAL_LEAVES } from '@/lib/mock-data';
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, Plane, CalendarDays
} from 'lucide-react';

interface AttendanceRecord {
  date: string; // YYYY-MM-DD
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

export function AttendanceTab() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayRecord, setSelectedDayRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Load and merge history/mock records
  useEffect(() => {
    if (!user) return;

    const historyRaw = localStorage.getItem(HISTORY_KEY(user.user_id));
    const history: AttendanceRecord[] = historyRaw ? JSON.parse(historyRaw) : [];

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

    const all = todayRecord
      ? [todayRecord, ...history.filter((r) => r.date !== today)]
      : history;

    if (all.length === 0) {
      // Generate rich mock data for the calendar (last 45 days)
      const mockRecords: AttendanceRecord[] = [];
      const now = new Date();
      for (let i = 0; i < 45; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // Skip Sundays
        if (d.getDay() === 0) continue;

        const dateStr = d.toISOString().slice(0, 10);
        
        // Check if there is an approved leave for this date
        const hasLeave = INITIAL_LEAVES.some(
          (l) => l.userId === user.user_id &&
          l.status === 'APPROVED' &&
          dateStr >= l.startDate &&
          dateStr <= l.endDate
        );

        if (hasLeave) continue; // Leaves are handled dynamically

        // 85% attendance, 15% absent rate
        const isPresent = Math.random() > 0.15;
        if (isPresent) {
          const checkInHour = 9 + (Math.random() > 0.7 ? 1 : 0); // Late sometimes
          const checkInMin = Math.floor(Math.random() * 30);
          const checkInTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), checkInHour, checkInMin, 0).getTime();
          const checkOutTime = checkInTime + (8 + Math.random()) * 3600000;
          
          mockRecords.push({
            date: dateStr,
            checkIn: checkInTime,
            checkOut: checkOutTime,
          });
        } else {
          // Absent record
          mockRecords.push({
            date: dateStr,
            checkIn: null,
            checkOut: null,
          });
        }
      }
      setRecords(mockRecords);
    } else {
      setRecords(all);
    }
  }, [user]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday etc

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    // Padding for first week
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [year, month, daysInMonth, firstDayIndex]);

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayRecord(null);
    setSelectedDateStr(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayRecord(null);
    setSelectedDateStr(null);
  };

  // Helper to check state of a date
  const getDayState = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // 1. Leave Check
    const leave = INITIAL_LEAVES.find(
      (l) => l.userId === user?.user_id &&
      l.status === 'APPROVED' &&
      dateStr >= l.startDate &&
      dateStr <= l.endDate
    );
    if (leave) return { type: 'LEAVE', record: null, leave };

    // 2. Attendance record check
    const rec = records.find((r) => r.date === dateStr);
    if (rec) {
      if (rec.checkIn && rec.checkOut) {
        return { type: 'PRESENT', record: rec };
      } else if (rec.checkIn) {
        return { type: 'ACTIVE', record: rec };
      } else {
        return { type: 'ABSENT', record: rec };
      }
    }

    // 3. Future dates check
    if (dateStr > todayStr) {
      return { type: 'FUTURE', record: null };
    }

    // 4. Sundays check
    if (date.getDay() === 0) {
      return { type: 'WEEKEND', record: null };
    }

    // 5. Default is absent for past dates
    return { type: 'ABSENT', record: null };
  };

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    const dateStr = date.toISOString().slice(0, 10);
    const state = getDayState(date);
    
    setSelectedDateStr(date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    
    if (state.type === 'PRESENT' || state.type === 'ACTIVE') {
      setSelectedDayRecord(state.record);
    } else if (state.type === 'LEAVE') {
      setSelectedDayRecord({
        date: dateStr,
        checkIn: null,
        checkOut: null,
      });
    } else {
      setSelectedDayRecord({
        date: dateStr,
        checkIn: null,
        checkOut: null,
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <h2 className="text-sm font-bold text-[var(--foreground)]">Attendance Calendar</h2>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Visual representation of your workday history</p>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-5 items-start">
        {/* Calendar Card */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-[var(--card-border)] pb-3">
            <h3 className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wide">
              {monthName} {year}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-1 rounded-md border border-[var(--card-border)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-md border border-[var(--card-border)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="aspect-square opacity-0" />;
              }

              const state = getDayState(date);
              const isSelected = selectedDateStr === date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              
              let cellClass = '';
              let badgeColor = '';
              let badgeIcon = null;

              if (state.type === 'PRESENT') {
                cellClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20';
                badgeColor = 'bg-emerald-500';
              } else if (state.type === 'ACTIVE') {
                cellClass = 'bg-teal-500/10 border-teal-500/20 text-[var(--brand-teal)] hover:bg-teal-500/20';
                badgeColor = 'bg-[var(--brand-teal)]';
              } else if (state.type === 'LEAVE') {
                cellClass = 'bg-sky-500/10 border-sky-500/20 text-sky-500 hover:bg-sky-500/20';
                badgeIcon = <Plane className="w-2.5 h-2.5 shrink-0" />;
              } else if (state.type === 'ABSENT') {
                cellClass = 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20';
                badgeColor = 'bg-red-500';
              } else if (state.type === 'WEEKEND') {
                cellClass = 'bg-[var(--input-bg)] border-[var(--card-border)]/50 text-[var(--text-muted)]/50 opacity-60';
              } else {
                // Future dates
                cellClass = 'bg-transparent border-[var(--card-border)] text-[var(--text-muted)] opacity-40 hover:bg-[var(--input-bg)]';
              }

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`aspect-square flex flex-col items-center justify-between p-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${cellClass} ${
                    isSelected ? 'ring-2 ring-[var(--brand-teal)] ring-offset-2 ring-offset-[var(--background)]' : ''
                  }`}
                >
                  <span className="self-start text-[10px]">{date.getDate()}</span>
                  <div className="flex items-center justify-center">
                    {badgeIcon ? badgeIcon : badgeColor ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex flex-wrap items-center gap-4 text-[10px] text-[var(--text-muted)] font-bold">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-teal)]" />
              <span>Active (Checked In)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1 text-sky-500">
              <Plane className="w-2.5 h-2.5" />
              <span>Approved Leave</span>
            </div>
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
          <h3 className="text-xs font-bold text-[var(--foreground)] border-b border-[var(--card-border)] pb-2 mb-3">
            Day Summary
          </h3>
          {selectedDateStr ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Selected Date</p>
                <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">{selectedDateStr}</p>
              </div>

              {selectedDayRecord?.checkIn ? (
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--brand-teal)] mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Check In Time</p>
                      <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">
                        {formatTime(selectedDayRecord.checkIn)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--brand-teal)] mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Check Out Time</p>
                      <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">
                        {selectedDayRecord.checkOut ? formatTime(selectedDayRecord.checkOut) : (
                          <span className="text-[var(--text-muted)] italic">In Progress</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {selectedDayRecord.checkOut && (
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Logged Hours</p>
                        <p className="text-xs font-bold text-emerald-500 mt-0.5">
                          {formatDuration(selectedDayRecord.checkIn, selectedDayRecord.checkOut)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Absent or Leave details */}
                  {INITIAL_LEAVES.some(
                    (l) => l.userId === user?.user_id &&
                    l.status === 'APPROVED' &&
                    records.find(r => r.date === selectedDayRecord?.date) === undefined &&
                    selectedDayRecord?.date !== undefined &&
                    selectedDayRecord.date >= l.startDate &&
                    selectedDayRecord.date <= l.endDate
                  ) ? (
                    <div className="flex items-start gap-2.5">
                      <Plane className="w-3.5 h-3.5 text-sky-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Status</p>
                        <p className="text-xs font-bold text-sky-500 mt-0.5">Approved Time Off</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          Reason: {INITIAL_LEAVES.find(l => selectedDayRecord?.date !== undefined && selectedDayRecord.date >= l.startDate && selectedDayRecord.date <= l.endDate)?.reason}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Status</p>
                        <p className="text-xs font-bold text-red-500 mt-0.5">Absent</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          No check-in recorded for this day.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <CalendarDays className="w-6 h-6 text-[var(--text-muted)] opacity-30" />
              <p className="text-[10px] text-[var(--text-muted)] font-bold">Select a date in the calendar to view its summary details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
