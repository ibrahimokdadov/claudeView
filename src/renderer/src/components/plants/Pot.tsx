import React from 'react'

interface PotProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const scaleMap = { sm: 0.6, md: 1, lg: 1.4 }

const Pot: React.FC<PotProps> = ({ size = 'md', label }) => {
  const s = scaleMap[size]

  return (
    <svg
      viewBox="0 0 80 35"
      width={80 * s}
      height={35 * s}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Subtle gradient for the pot body */}
        <linearGradient id="potBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="40%" stopColor="#c2956a" />
          <stop offset="100%" stopColor="#a87d52" />
        </linearGradient>

        {/* Lip highlight */}
        <linearGradient id="potLip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbb896" />
          <stop offset="100%" stopColor="#c2956a" />
        </linearGradient>

        {/* Inner shadow at the top of the pot */}
        <radialGradient id="potInner" cx="0.5" cy="0" r="0.6">
          <stop offset="0%" stopColor="#6b4c35" />
          <stop offset="100%" stopColor="#8b6244" />
        </radialGradient>
      </defs>

      {/* Pot body — tapered trapezoid with slightly rounded edges */}
      <path
        d="M12,10 L8,31 Q8,34 11,34 L69,34 Q72,34 72,31 L68,10 Z"
        fill="url(#potBody)"
      />

      {/* Right-side shadow for depth */}
      <path
        d="M55,10 L68,10 L72,31 Q72,34 69,34 L56,34 Z"
        fill="#a87d52"
        opacity="0.5"
      />

      {/* Lip — slightly wider rounded strip on top */}
      <rect x="8" y="7" width="64" height="6" rx="3" ry="3" fill="url(#potLip)" />

      {/* Lip bottom shadow line */}
      <line x1="10" y1="13" x2="70" y2="13" stroke="#a87d52" strokeWidth="0.6" opacity="0.6" />

      {/* Soil peek at the top */}
      <ellipse cx="40" cy="10" rx="28" ry="3" fill="url(#potInner)" />

      {/* Rim highlight */}
      <path
        d="M12,8 Q40,5 68,8"
        fill="none"
        stroke="#dbb896"
        strokeWidth="0.8"
        opacity="0.7"
      />

      {/* Optional label on the pot */}
      {label && (
        <text
          x="40"
          y="25"
          textAnchor="middle"
          fontSize="7"
          fontFamily="system-ui, sans-serif"
          fill="#7a5538"
          opacity="0.8"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label.length > 10 ? label.slice(0, 9) + '\u2026' : label}
        </text>
      )}
    </svg>
  )
}

export default Pot
