'use client';

import React from 'react';
import Image from 'next/image';

interface YemenflexLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
}

export default function YemenflexLogo({
  size = 'md',
  showSubtitle = true,
  iconOnly = false,
  className = '',
  priority = false,
}: YemenflexLogoProps) {
  // Dimensions mapping
  const dimensions = {
    sm: {
      icon: 32,
      iconClass: 'w-8 h-8',
      titleClass: 'text-base font-extrabold',
      subClass: 'text-[9px]',
      gap: 'gap-2',
    },
    md: {
      icon: 40,
      iconClass: 'w-10 h-10',
      titleClass: 'text-xl font-black',
      subClass: 'text-[10.5px]',
      gap: 'gap-2.5',
    },
    lg: {
      icon: 54,
      iconClass: 'w-13 h-13',
      titleClass: 'text-2xl sm:text-3xl font-black',
      subClass: 'text-xs sm:text-sm',
      gap: 'gap-3.5',
    },
    xl: {
      icon: 72,
      iconClass: 'w-18 h-18',
      titleClass: 'text-3xl sm:text-4xl font-black',
      subClass: 'text-sm sm:text-base',
      gap: 'gap-4',
    },
  }[size];

  return (
    <div
      id={`yemenflex-logo-${size}`}
      className={`inline-flex items-center ${dimensions.gap} select-none ${className}`}
      dir="ltr"
    >
      {/* Visual Emblem Icon */}
      <div
        className={`relative ${dimensions.iconClass} flex-shrink-0 rounded-xl overflow-hidden bg-neutral-900 shadow-md shadow-red-950/40 ring-1 ring-red-600/30 group-hover:ring-red-500/60 transition-all duration-300`}
      >
        <Image
          src="/yemenflex-icon.png"
          alt="Yemenflex Logo"
          width={dimensions.icon}
          height={dimensions.icon}
          priority={priority}
          className="w-full h-full object-cover object-center transform transition duration-300 group-hover:scale-105"
        />
      </div>

      {/* Typography and Subtitle */}
      {!iconOnly && (
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center tracking-tight">
            {/* Red Y + White emenflex */}
            <span className={`${dimensions.titleClass} text-red-600 font-extrabold drop-shadow-[0_2px_8px_rgba(220,38,38,0.5)]`}>
              Y
            </span>
            <span className={`${dimensions.titleClass} text-white font-extrabold tracking-normal`}>
              emenflex
            </span>
          </div>

          {showSubtitle && (
            <span
              className={`${dimensions.subClass} text-neutral-300/90 font-medium tracking-normal -mt-0.5`}
              dir="rtl"
              style={{ fontSize: '7.5px', lineHeight: '8.625px', textAlign: 'center' }}
            >
              لمشاهدة الأفلام والمسلسلات
            </span>
          )}
        </div>
      )}
    </div>
  );
}
