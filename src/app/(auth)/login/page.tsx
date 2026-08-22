'use client';

import React from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between relative selection:bg-teal-500/20">
      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 sm:py-14">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center">
          {/* Left Column: Company Introduction */}
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[var(--brand-teal)] text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>B2B SaaS Workspace Gateway</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.15]">
                Work smarter.{' '}
                <span className="text-[var(--brand-teal)] block sm:inline">
                  Feel supported.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-lg leading-relaxed">
                MY BUDDY brings attendance, leave, payroll, profiles, and HR approvals into one secure, role-based workspace.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-[var(--foreground)] font-medium">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-teal)] shrink-0" />
                <span>Role-based employee &amp; HR access</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-teal)] shrink-0" />
                <span>Dual-factor smart kiosk attendance (Photo + GPS coordinates)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-teal)] shrink-0" />
                <span>End-to-end leave workflows &amp; compensation control</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[var(--card-border)]">
              <div>
                <p className="text-xl sm:text-2xl font-black text-[var(--brand-teal)] font-mono">100m</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Geofence Radius</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[var(--brand-teal)] font-mono">24/7</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">HR Visibility</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[var(--brand-teal)] font-mono">RBAC</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Protected Access</p>
              </div>
            </div>
          </div>

          {/* Right Column: Logo & Minimal Auth Form */}
          <div className="flex justify-center w-full">
            <AuthCard initialMode="signin" />
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-[var(--text-muted)] border-t border-[var(--card-border)]">
        <p>© {new Date().getFullYear()} My Buddy HRMS. All rights reserved.</p>
      </footer>
    </div>
  );
}
