'use client';

import React from 'react';

/**
 * NeoSymbol: Componente que renderiza o 'N' estilizado autêntico da marca NEO.
 * Suporta rotação contínua ambiente, aceleração ao passar o mouse e gradiente dinâmico.
 */
export function NeoSymbol({
  className = "w-8 h-8",
  spinning = true,
  speed = "normal",
  gradient = true,
  color,
  style = {},
  ...props
}) {
  const gradientId = React.useId();

  const speedClass =
    speed === 'slow' ? 'animate-neo-spin [animation-duration:18s]' :
    speed === 'fast' ? 'animate-neo-spin [animation-duration:4s]' :
    'animate-neo-spin [animation-duration:10s]';

  return (
    <svg
      viewBox="0 0 100 100"
      className={`inline-block shrink-0 select-none transition-transform duration-300 ${
        spinning ? speedClass : ''
      } hover:[animation-duration:3s] ${className}`}
      style={{
        ...style,
        color: color || 'currentColor',
      }}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Dynamic NEO electric gradient */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary, 9 90% 59%))" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="hsl(var(--primary, 9 90% 59%))" />
        </linearGradient>
      </defs>

      {/* Geometria do 'N' estilizado da marca NEO */}
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

export default NeoSymbol;
