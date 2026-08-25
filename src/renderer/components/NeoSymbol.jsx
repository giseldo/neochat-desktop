import React from 'react';
import { cn } from '../lib/utils';

/**
 * NeoSymbol: Component that renders the authentic stylized 'N' from the NEO brand.
 * Supports smooth continuous ambient rotation, speedup on hover, and burst animation on trigger.
 */
export function NeoSymbol({
  className = "w-8 h-8",
  spinning = true,
  spinBurst = false,
  speed = "normal",
  gradient = true,
  color,
  style = {},
  ...props
}) {
  const gradientId = React.useId();

  const speedClass = 
    speed === 'slow' ? 'animate-neo-spin [animation-duration:18s]' :
    speed === 'fast' ? 'animate-neo-spin-fast' :
    'animate-neo-spin [animation-duration:10s]';

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(
        "inline-block shrink-0 select-none transition-transform duration-300",
        spinBurst 
          ? "animate-neo-burst" 
          : (spinning ? speedClass : ""),
        "hover:[animation-duration:3s]",
        className
      )}
      style={{
        ...style,
        color: color || 'currentColor'
      }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Dynamic NEO electric gradient */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary, #2563EB)" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="var(--primary, #2563EB)" />
        </linearGradient>
      </defs>

      {/* Stylized 'N' Geometry from NEO Brand */}
      <path
        d="M 14.3 77.6 L 14 24.8 L 15.2 23.6 L 26.6 23.6 L 76.1 76.4 L 86 76.4 L 86 22.4 L 76.1 34.4 L 76.1 62.9 L 24.2 37.4 L 24.2 65.3 L 14.3 77.6 Z"
        fill={gradient ? `url(#${gradientId})` : (color || 'currentColor')}
        stroke={gradient ? `url(#${gradientId})` : (color || 'currentColor')}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Backwards-compatible aliases
export const NeoRotatingLogo = NeoSymbol;
export const ClaudeAsterisk = NeoSymbol;

export default NeoSymbol;
