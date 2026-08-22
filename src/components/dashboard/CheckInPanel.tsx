'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const CHECKIN_KEY = (userId: string) => `my_buddy_hrms_checkin_${userId}`;

interface CheckInRecord {
  timestamp: number; // ms since epoch
  date: string; // YYYY-MM-DD
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

interface CheckInPanelProps {
  onStatusChange?: (status: 'PRESENT' | 'ABSENT') => void;
}

export function CheckInPanel({ onStatusChange }: CheckInPanelProps) {
  const { user } = useAuth();
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  // Load stored record on mount
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(CHECKIN_KEY(user.user_id));
    if (raw) {
      try {
        const parsed: CheckInRecord = JSON.parse(raw);
        if (parsed.date === getToday()) {
          setRecord(parsed);
          onStatusChange?.('PRESENT');
        } else {
          localStorage.removeItem(CHECKIN_KEY(user.user_id));
        }
      } catch {
        // ignore
      }
    }
  }, [user, onStatusChange]);

  // Tick elapsed timer
  useEffect(() => {
    if (!record) { setElapsed(0); return; }
    const tick = () => setElapsed(Date.now() - record.timestamp);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [record]);

  const handleCheckIn = useCallback(() => {
    if (!user || record) return;
    const newRecord: CheckInRecord = { timestamp: Date.now(), date: getToday() };
    localStorage.setItem(CHECKIN_KEY(user.user_id), JSON.stringify(newRecord));
    setRecord(newRecord);
    setJustCheckedIn(true);
    onStatusChange?.('PRESENT');
    setTimeout(() => setJustCheckedIn(false), 2000);
  }, [user, record, onStatusChange]);

  const handleCheckOut = useCallback(() => {
    if (!user || !record) return;
    localStorage.removeItem(CHECKIN_KEY(user.user_id));
    setRecord(null);
    setElapsed(0);
    onStatusChange?.('ABSENT');
  }, [user, record, onStatusChange]);

  const isCheckedIn = !!record;

  return (
    <div className="flex flex-col gap-3">
      {/* Status dot */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
            isCheckedIn
              ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]'
              : 'bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]'
          }`}
        />
        <span className={`text-xs font-semibold ${isCheckedIn ? 'text-emerald-500' : 'text-red-500'}`}>
          {isCheckedIn ? 'Checked In' : 'Not Checked In'}
        </span>
      </div>

      {/* Check In button */}
      <button
        onClick={handleCheckIn}
        disabled={isCheckedIn}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
          isCheckedIn
            ? 'border-[var(--card-border)] text-[var(--text-muted)] bg-[var(--input-bg)] cursor-not-allowed opacity-50'
            : 'border-[var(--brand-teal)] text-[var(--brand-teal)] hover:bg-[var(--brand-teal)] hover:text-white cursor-pointer'
        } ${justCheckedIn ? 'scale-95' : ''}`}
      >
        <span>Check In</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Elapsed time */}
      {isCheckedIn && record && (
        <div className="px-4 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-0.5">
            Since {formatTime(record.timestamp)}
          </p>
          <p className="text-sm font-bold text-[var(--brand-teal)] font-mono">{formatElapsed(elapsed)}</p>
        </div>
      )}

      {/* Check Out button */}
      <button
        onClick={handleCheckOut}
        disabled={!isCheckedIn}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
          !isCheckedIn
            ? 'border-[var(--card-border)] text-[var(--text-muted)] bg-[var(--input-bg)] cursor-not-allowed opacity-50'
            : 'border-red-500/40 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer'
        }`}
      >
        <span>Check Out</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
