'use client';

import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getStoredUsers } from '@/lib/auth';
import { StoredUser } from '@/types/auth';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeDetailModal } from './EmployeeDetailModal';

export function EmployeesTab() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StoredUser | null>(null);

  const isAdmin = user?.role === 'HR_ADMIN';

  // HR Admin: all users; Employee: only themselves
  const allUsers = getStoredUsers();
  const displayUsers = isAdmin
    ? allUsers.filter((u) =>
        search
          ? `${u.first_name} ${u.last_name} ${u.job_title} ${u.department}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true
      )
    : allUsers.filter((u) => u.user_id === user?.user_id);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Toolbar — HR Admin only */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--brand-teal)] rounded-lg outline-none text-[var(--foreground)] placeholder:text-[var(--text-muted)]/60 transition-colors"
            />
          </div>
          <button className="h-9 px-3.5 flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            NEW
          </button>
        </div>
      )}

      {/* Employee heading for non-admin */}
      {!isAdmin && (
        <div>
          <h2 className="text-sm font-bold text-[var(--foreground)]">My Profile Card</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Your employee profile view</p>
        </div>
      )}

      {/* Grid */}
      {displayUsers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">No employees found.</p>
        </div>
      ) : (
        <div
          className={
            isAdmin
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3'
              : 'flex justify-start'
          }
        >
          {displayUsers.map((emp) => (
            <EmployeeCard
              key={emp.user_id}
              user_id={emp.user_id}
              name={emp.name || `${emp.first_name} ${emp.last_name}`.trim()}
              job_title={emp.job_title}
              department={emp.department}
              attendance_status={emp.attendance_status}
              onClick={() => setSelected(emp)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-auto pt-4 border-t border-[var(--card-border)] flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Present in office</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sky-400 text-xs">✈</span>
          <span>On leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Absent (no time off applied)</span>
        </div>
      </div>

      {/* Detail Modal */}
      <EmployeeDetailModal employee={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
