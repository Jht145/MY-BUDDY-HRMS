'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { INITIAL_LEAVES } from '@/lib/mock-data';
import { CalendarDays, Plus, Clock } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-400/10 text-amber-500 border-amber-400/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  PAID: 'Paid Leave',
  SICK: 'Sick Leave',
  UNPAID: 'Unpaid Leave',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TimeOffTab() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'PAID' | 'SICK' | 'UNPAID'>('PAID');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [myLeaves, setMyLeaves] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadLeaves() {
      if (!user) return;
      try {
        const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
        const res = await fetch('/api/v1/leaves/my-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setMyLeaves(data.leave_requests.map((l: any) => ({
            id: l.leave_id,
            type: l.leave_type,
            startDate: l.start_date,
            endDate: l.end_date,
            reason: l.leave_reason,
            status: l.leave_status,
            adminComment: l.admin_comment
          })));
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadLeaves();
  }, [user, submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('my_buddy_hrms_jwt_v4');
      const res = await fetch('/api/v1/leaves/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leave_type: type, start_date: startDate, end_date: endDate, leave_reason: reason })
      });
      if (res.ok) {
        setSubmitted(true);
        setShowForm(false);
        setReason('');
        setStartDate('');
        setEndDate('');
        setTimeout(() => setSubmitted(false), 4000);
      } else {
        const errData = await res.json();
        alert(errData.detail?.message || errData.message || 'Failed to submit leave request.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--foreground)]">Time Off Requests</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Your leave applications and status</p>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="h-8 px-3 flex items-center gap-1.5 bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Apply Leave
        </button>
      </div>

      {/* Success message */}
      {submitted && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
          ✓ Leave request submitted successfully. Pending HR approval.
        </div>
      )}

      {/* Apply form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] space-y-3">
          <p className="text-xs font-bold text-[var(--foreground)]">New Leave Application</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold block mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-9 px-2.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg outline-none text-[var(--foreground)] focus:border-[var(--brand-teal)] transition-colors"
              >
                <option value="PAID">Paid Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>
            <div />
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold block mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-2.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg outline-none text-[var(--foreground)] focus:border-[var(--brand-teal)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold block mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-2.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg outline-none text-[var(--foreground)] focus:border-[var(--brand-teal)] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold block mb-1">Reason</label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for leave..."
              className="w-full px-2.5 py-2 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg outline-none text-[var(--foreground)] placeholder:text-[var(--text-muted)]/60 focus:border-[var(--brand-teal)] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 text-xs font-bold bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white rounded-lg transition-colors cursor-pointer">
              Submit
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Leave list */}
      <div className="space-y-3">
        {myLeaves.length === 0 && !submitted && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--text-muted)]">
            <CalendarDays className="w-8 h-8 opacity-30" />
            <p className="text-xs">No leave requests yet.</p>
          </div>
        )}
        {myLeaves.map((leave) => (
          <div key={leave.id} className="flex items-start gap-4 p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4 text-[var(--brand-teal)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--foreground)]">{TYPE_LABELS[leave.type]}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[leave.status]}`}>
                  {leave.status}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {formatDate(leave.startDate)} → {formatDate(leave.endDate)} · {leave.days} day{leave.days !== 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]/80 mt-0.5 truncate">{leave.reason}</p>
              <p className="text-[10px] text-[var(--text-muted)]/60 mt-1 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Applied {formatDate(leave.appliedDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
