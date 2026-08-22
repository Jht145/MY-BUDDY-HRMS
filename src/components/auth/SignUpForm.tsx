'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Upload, Check } from 'lucide-react';

interface SignUpFormProps {
  onSuccess?: () => void;
  onShake?: () => void;
  onSwitchToSignIn?: () => void;
}

export function SignUpForm({ onSuccess, onShake, onSwitchToSignIn }: SignUpFormProps) {
  const { signUp } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    company_logo: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, company_logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!formData.company_name.trim()) errs.company_name = 'Company Name is required';
    if (!formData.name.trim()) errs.name = 'Name is required';

    if (!formData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    }

    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirm_password) {
      errs.confirm_password = 'Passwords do not match';
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
      const user = await signUp({
        company_name: formData.company_name.trim(),
        company_logo: formData.company_logo,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });
      setSuccessMsg(`Account created for ${user.company_name}! Ready to sign in.`);
      onSuccess?.();
    } catch (err: any) {
      onShake?.();
      setServerError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-left" noValidate>
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

      {/* Hidden File Input for Company Logo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Field: Company Name :- with upload icon */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wide text-[var(--foreground)]">
          Company Name :-
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => {
              setFormData({ ...formData, company_name: e.target.value });
              if (errors.company_name) setErrors((prev) => ({ ...prev, company_name: '' }));
            }}
            placeholder="Enter company name"
            disabled={loading}
            className={`w-full h-10 pl-3 pr-12 rounded-md text-sm bg-[var(--input-bg)] text-[var(--foreground)] border ${
              errors.company_name
                ? 'border-[var(--danger)]'
                : 'border-[var(--input-border)] focus:border-[var(--brand-teal)]'
            } outline-none transition-colors placeholder:text-[var(--text-muted)]/60`}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={logoFileName ? `Logo: ${logoFileName}` : 'Upload Company Logo'}
            className="absolute right-1.5 p-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            {logoFileName ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          </button>
        </div>
        {logoFileName && (
          <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
            Attached logo: {logoFileName}
          </p>
        )}
        {errors.company_name && (
          <p className="text-[11px] text-[var(--danger)] font-medium mt-0.5">{errors.company_name}</p>
        )}
      </div>

      {/* Field: Name :- */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wide text-[var(--foreground)]">
          Name :-
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          placeholder="Enter full name"
          disabled={loading}
          className={`w-full h-10 px-3 rounded-md text-sm bg-[var(--input-bg)] text-[var(--foreground)] border ${
            errors.name
              ? 'border-[var(--danger)]'
              : 'border-[var(--input-border)] focus:border-[var(--brand-teal)]'
          } outline-none transition-colors placeholder:text-[var(--text-muted)]/60`}
        />
        {errors.name && (
          <p className="text-[11px] text-[var(--danger)] font-medium mt-0.5">{errors.name}</p>
        )}
      </div>

      {/* Field: Email :- */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wide text-[var(--foreground)]">
          Email :-
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
          }}
          placeholder="Enter email address"
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

      {/* Field: Phone :- */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wide text-[var(--foreground)]">
          Phone :-
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => {
            setFormData({ ...formData, phone: e.target.value });
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
          }}
          placeholder="Enter phone number"
          disabled={loading}
          className={`w-full h-10 px-3 rounded-md text-sm bg-[var(--input-bg)] text-[var(--foreground)] border ${
            errors.phone
              ? 'border-[var(--danger)]'
              : 'border-[var(--input-border)] focus:border-[var(--brand-teal)]'
          } outline-none transition-colors placeholder:text-[var(--text-muted)]/60`}
        />
        {errors.phone && (
          <p className="text-[11px] text-[var(--danger)] font-medium mt-0.5">{errors.phone}</p>
        )}
      </div>

      {/* Field: Password :- */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wide text-[var(--foreground)]">
          Password :-
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            placeholder="Enter password"
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

      {/* Field: Confirm Password :- */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold tracking-wide text-[var(--foreground)]">
          Confirm Password :-
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirm_password}
            onChange={(e) => {
              setFormData({ ...formData, confirm_password: e.target.value });
              if (errors.confirm_password) setErrors((prev) => ({ ...prev, confirm_password: '' }));
            }}
            placeholder="Re-enter password"
            disabled={loading}
            className={`w-full h-10 pl-3 pr-10 rounded-md text-sm bg-[var(--input-bg)] text-[var(--foreground)] border ${
              errors.confirm_password
                ? 'border-[var(--danger)]'
                : 'border-[var(--input-border)] focus:border-[var(--brand-teal)]'
            } outline-none transition-colors placeholder:text-[var(--text-muted)]/60`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="text-[11px] text-[var(--danger)] font-medium mt-0.5">
            {errors.confirm_password}
          </p>
        )}
      </div>

      {/* Button: Sign Up */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 mt-3 rounded-md bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-hover)] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-sm active:scale-[0.99]"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <span>Sign Up</span>
        )}
      </button>

      {/* Switcher: Already have an account ? Sign In */}
      {onSwitchToSignIn && (
        <div className="pt-2 text-center text-xs text-[var(--text-muted)]">
          Already have an account ?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-semibold text-[var(--brand-teal)] hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>
      )}
    </form>
  );
}
