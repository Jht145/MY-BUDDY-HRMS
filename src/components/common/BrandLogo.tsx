'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
}

export function BrandLogo({ size = 'md', href, className = '' }: BrandLogoProps) {
  const { theme } = useTheme();

  const sizeMap = {
    sm: { height: 42, width: 140 },
    md: { height: 64, width: 200 },
    lg: { height: 80, width: 260 },
  };

  const currentSize = sizeMap[size];
  const isDark = theme === 'dark';

  const logoContent = (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <img
        src={isDark ? '/logo_dark.png' : '/logo_light.png'}
        alt="My Buddy"
        style={{
          height: `${currentSize.height}px`,
          width: 'auto',
          objectFit: 'contain',
        }}
        className="transition-all duration-200"
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block hover:opacity-95 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
