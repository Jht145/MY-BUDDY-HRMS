'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface SignInFormProps {
  onSuccess?: () => void;
  onShake?: () => void;
  onSwitchToSignUp?: () => void;
}

export function SignInForm({ onSuccess, onShake, onSwitchToSignUp }: SignInFormProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = 'Login Id / Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMsg(null);

    if (!validate()) {
      onShake?.();
      return;
    }

    setLoading(true);
    try {
      const user = await signIn({ email: email.trim(), password });
      setSuccessMsg(`Welcome back, ${user.first_name || user.name || user.email}! Authentication verified.`);
      onSuccess?.();
    } catch (err: any) {
      onShake?.();
      setServerError(err.message || 'Invalid Login Id/Email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fadeIn">
          {successMsg}
        </div>
      )}

      {serverError && (
        <div className="p-3 rounded-md bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] text-xs font-medium animate-fadeIn">
          {serverError}
        </div>
      )}

      {/* Field: Login Id/Email :- */}
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="signin-email"
          className="block text-xs font-semibold tracking-wide text-[var(--foreground)]"
        >
          Login Id/Email :-
        </label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="Enter your login ID or email"
          disabled={loading}
          className={`w-full h-10 px-3 rounded-md text-sm bg-[var(--input-bg)] text-[var(--foreground)] border ${
            errors.email
              ? 'border-[var(--danger)]'
              : 'border-[var(--input-border)] focus:border-[var(--brand-teal)]'
          } outline-none transition-colors placeholder:text-[var(--text-muted)]/60`}
        />
        {errors.email && (
          <p className="text-[11px] text-[var(--danger)] font-medium mt-0.5">{errors.email}</p>
        )}
      </div>

      {/* Field: Password :- */}
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="signin-password"
          className="block text-xs font-semibold tracking-wide text-[var(--foreground)]"
        >
          Password :-
        </label>
        <div className="relative">
          <input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Enter your password"
            disabled={loading}
            className={`w-full h-10 pl-3 pr-10 rounded-md text-sm bg-[var(--input-bg)] text-[var(--foreground)] border ${
              errors.password
                ? 'border-[var(--danger)]'
                : 'border-[var(--input-border)] focus:border-[var(--brand-teal)]'
            } outline-none transition-colors placeholder:text-[var(--text-muted)]/60`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-[11px] text-[var(--danger)] font-medium mt-0.5">{errors.password}</p>
        )}
      </div>

      {/* Button: SIGN IN */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 mt-2 rounded-md bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-sm active:scale-[0.99]"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Signing In...</span>
          </>
        ) : (
          <span>SIGN IN</span>
        )}
      </button>

      {/* Switcher: Don't have an Account? Sign Up */}
      {onSwitchToSignUp && (
        <div className="pt-2 text-center text-xs text-[var(--text-muted)]">
          Don&apos;t have an Account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-semibold text-[var(--brand-teal)] hover:underline cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      )}
    </form>
  );
}
