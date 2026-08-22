'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  fixed?: boolean;
  className?: string;
}

export function ThemeToggle({ fixed = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const buttonClasses = fixed
    ? 'fixed top-5 right-5 z-50 p-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:border-teal-500 transition-all shadow-md backdrop-blur'
    : `p-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:border-teal-500 transition-all ${className}`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={buttonClasses}
      aria-label="Toggle Light / Dark Theme"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" />
      )}
    </button>
  );
}
