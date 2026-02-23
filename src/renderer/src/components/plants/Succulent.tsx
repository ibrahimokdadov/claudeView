import React from 'react'
import type { PlantProps } from './PlantProps'

const scaleMap = { sm: 0.6, md: 1, lg: 1.4 }

const Succulent: React.FC<PlantProps> = ({ state, size = 'md', growth = 0.5 }) => {
  const s = scaleMap[size]
  const g = Math.max(0, Math.min(1, growth))

  // Leaf count ramps with growth
  const leafCount = g < 0.3 ? 3 : g < 0.5 ? 5 : g < 0.7 ? 6 : 8
  const showSpike = state === 'done'

  // Generate rosette leaves radiating from center
  const leaves: React.ReactNode[] = []
  const cx = 40
  const cy = 68
  const baseRadius = 10 + g * 10 // leaves get bigger with growth
  const leafWidth = 6 + g * 3

  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2 - Math.PI / 2
    const tipX = cx + Math.cos(angle) * baseRadius
    const tipY = cy + Math.sin(angle) * baseRadius * 0.75

    // Control point perpendicular to leaf direction for plump shape
    const perpAngle = angle + Math.PI / 2
    const cp1x = cx + Math.cos(angle) * baseRadius * 0.5 + Math.cos(perpAngle) * leafWidth
    const cp1y = cy + Math.sin(angle) * baseRadius * 0.5 * 0.75 + Math.sin(perpAngle) * leafWidth * 0.75
    const cp2x = cx + Math.cos(angle) * baseRadius * 0.5 - Math.cos(perpAngle) * leafWidth
    const cp2y = cy + Math.sin(angle) * baseRadius * 0.5 * 0.75 - Math.sin(perpAngle) * leafWidth * 0.75

    const isOuter = i % 2 === 0
    const opacity = isOuter ? 0.85 : 1

    leaves.push(
      <path
        key={i}
        d={`M${cx},${cy} C${cp1x},${cp1y} ${tipX + Math.cos(perpAngle) * 2},${tipY + Math.sin(perpAngle) * 2} ${tipX},${tipY} C${tipX - Math.cos(perpAngle) * 2},${tipY - Math.sin(perpAngle) * 2} ${cp2x},${cp2y} ${cx},${cy}`}
        fill="var(--plant-primary, #5b9a5f)"
        opacity={opacity}
        stroke="var(--plant-accent, #4a8050)"
        strokeWidth="0.4"
      />
    )
  }

  return (
    <svg
      viewBox="0 0 80 100"
      width={80 * s}
      height={100 * s}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="succulentSheen" cx="0.35" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="succulentCenter" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--plant-accent, #4a8050)" />
          <stop offset="100%" stopColor="var(--plant-primary, #5b9a5f)" />
        </radialGradient>
      </defs>

      <g data-state={state} className="plant-root">
        {/* Short stem connecting to pot area */}
        <rect x="38" y="78" width="4" height="10" rx="2" fill="var(--plant-accent, #4a8050)" opacity="0.7" />

        {/* Rosette leaves — outer first, inner on top */}
        {leaves}

        {/* Leaf sheen overlay */}
        <circle cx={cx} cy={cy} r={baseRadius} fill="url(#succulentSheen)" />

        {/* Center bud */}
        <ellipse cx={cx} cy={cy} rx={3 + g * 1.5} ry={2.5 + g} fill="url(#succulentCenter)" />

        {/* Flower spike when done */}
        {showSpike && (
          <>
            <line x1="40" y1="68" x2="40" y2="42" stroke="var(--plant-accent, #4a8050)" strokeWidth="1.5" />
            <circle className="bloom-particle" cx="40" cy="40" r="3.5" fill="var(--plant-bloom, #e8a0bf)" />
            <circle className="bloom-particle" cx="37" cy="43" r="2" fill="var(--plant-bloom, #e8a0bf)" opacity="0.8" />
            <circle className="bloom-particle" cx="43" cy="43" r="2" fill="var(--plant-bloom, #e8a0bf)" opacity="0.8" />
          </>
        )}
      </g>
    </svg>
  )
}

export default Succulent
