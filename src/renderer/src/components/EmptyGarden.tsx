import React from 'react'

export function EmptyGarden(): React.JSX.Element {
  return (
    <div className="empty-garden">
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="empty-garden-svg">
        {/* Garden bed / soil line */}
        <rect x="10" y="60" width="100" height="12" rx="6" fill="rgba(139, 90, 43, 0.25)" />
        <rect x="10" y="60" width="100" height="3" rx="1.5" fill="rgba(139, 90, 43, 0.15)" />

        {/* Empty pot left */}
        <path d="M25 42 L22 58 L38 58 L35 42 Z" fill="rgba(194, 149, 106, 0.3)" />
        <rect x="21" y="39" width="18" height="4" rx="2" fill="rgba(194, 149, 106, 0.35)" />

        {/* Empty pot center */}
        <path d="M52 42 L49 58 L65 58 L62 42 Z" fill="rgba(194, 149, 106, 0.3)" />
        <rect x="48" y="39" width="18" height="4" rx="2" fill="rgba(194, 149, 106, 0.35)" />

        {/* Empty pot right */}
        <path d="M79 42 L76 58 L92 58 L89 42 Z" fill="rgba(194, 149, 106, 0.3)" />
        <rect x="75" y="39" width="18" height="4" rx="2" fill="rgba(194, 149, 106, 0.35)" />

        {/* Tiny seed in center pot */}
        <circle cx="57" cy="38" r="2" fill="rgba(139, 90, 43, 0.4)" />

        {/* Dotted arc suggesting growth potential */}
        <path
          d="M52 30 Q57 20 62 30"
          stroke="rgba(74, 222, 128, 0.2)"
          strokeWidth="1"
          strokeDasharray="2 3"
          fill="none"
        />
      </svg>
      <div className="empty-garden-title">No sessions growing</div>
      <div className="empty-garden-subtitle">Start a Claude Code session to plant your garden</div>
    </div>
  )
}
