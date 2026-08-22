'use client';

import React, { useState } from 'react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

interface AuthCardProps {
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export function AuthCard({ initialMode = 'signin', onSuccess }: AuthCardProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialMode);
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  return (
    <div
      className={`w-full max-w-[420px] bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg p-6 sm:p-7 transition-all relative ${
        isShaking ? 'animate-shake' : ''
      }`}
    >
      {/* App/Web Logo Area */}
      <div className="flex justify-center items-center mb-6 pt-1">
        <BrandLogo size="md" />
      </div>

      {/* Form Content */}
      {activeTab === 'signin' ? (
        <SignInForm
          onShake={triggerShake}
          onSuccess={onSuccess}
          onSwitchToSignUp={() => setActiveTab('signup')}
        />
      ) : (
        <SignUpForm
          onShake={triggerShake}
          onSuccess={onSuccess}
          onSwitchToSignIn={() => setActiveTab('signin')}
        />
      )}
    </div>
  );
}
