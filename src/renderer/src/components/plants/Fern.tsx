import React from 'react'
import type { PlantProps } from './PlantProps'

const scaleMap = { sm: 0.6, md: 1, lg: 1.4 }

const Fern: React.FC<PlantProps> = ({ state, size = 'md', growth = 0.5 }) => {
  const s = scaleMap[size]
  const g = Math.max(0, Math.min(1, growth))

  const frondCount = g < 0.3 ? 2 : g < 0.5 ? 3 : g < 0.7 ? 4 : 6
  const baseX = 40
  const baseY = 82

  // Generate fronds arching outward
  const fronds: React.ReactNode[] = []

  const frondConfigs = [
    { angle: -70, lean: -18, length: 0.9 },   // far left
    { angle: 70, lean: 18, length: 0.9 },     // far right
    { angle: -45, lean: -10, length: 1 },      // mid left
    { angle: 45, lean: 10, length: 1 },        // mid right
    { angle: -20, lean: -4, length: 0.85 },    // inner left
    { angle: 20, lean: 4, length: 0.85 },      // inner right
  ]

  for (let i = 0; i < frondCount; i++) {
    const cfg = frondConfigs[i]
    const rad = (cfg.angle * Math.PI) / 180
    const frondLen = (28 + g * 14) * cfg.length
    const tipX = baseX + Math.sin(rad) * frondLen
    const tipY = baseY - Math.cos(rad) * frondLen

    // Arching control point
    const cpX = baseX + Math.sin(rad) * frondLen * 0.6 + cfg.lean
    const cpY = baseY - Math.cos(rad) * frondLen * 0.75

    // Main stem of frond
    const stemPath = `M${baseX},${baseY} Q${cpX},${cpY} ${tipX},${tipY}`

    // Generate leaflets along the frond
    const leaflets: React.ReactNode[] = []
    const leafletCount = Math.floor(4 + g * 4)

    for (let j = 1; j <= leafletCount; j++) {
      const t = j / (leafletCount + 1)
      // Position on quadratic bezier
      const px = (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * cpX + t * t * tipX
      const py = (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * cpY + t * t * tipY
      // Tangent direction
      const tx = 2 * (1 - t) * (cpX - baseX) + 2 * t * (tipX - cpX)
      const ty = 2 * (1 - t) * (cpY - baseY) + 2 * t * (tipY - cpY)
      const len = Math.sqrt(tx * tx + ty * ty) || 1
      const nx = -ty / len
      const ny = tx / len

      const leafSize = (3.5 + g * 2) * (1 - t * 0.5) // smaller toward tip
      const side = j % 2 === 0 ? 1 : -1

      leaflets.push(
        <ellipse
          key={`leaf-${i}-${j}`}
          cx={px + nx * side * leafSize * 0.5}
          cy={py + ny * side * leafSize * 0.5}
          rx={leafSize}
          ry={leafSize * 0.4}
          transform={`rotate(${(Math.atan2(ty, tx) * 180) / Math.PI + side * 30}, ${px + nx * side * leafSize * 0.5}, ${py + ny * side * leafSize * 0.5})`}
          fill="var(--plant-primary, #4a9e5c)"
          opacity={0.8 + t * 0.2}
        />
      )
    }

    fronds.push(
      <g key={`frond-${i}`}>
        {leaflets}
        <path
          d={stemPath}
          fill="none"
          stroke="var(--plant-accent, #3d7a46)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
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
        <radialGradient id="fernSheen" cx="0.4" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g data-state={state} className="plant-root">
        {/* Crown / base clump */}
        <ellipse cx={baseX} cy={baseY + 2} rx="6" ry="4" fill="var(--plant-accent, #3d7a46)" opacity="0.6" />

        {/* Fronds */}
        {fronds}

        {/* Subtle sheen across the whole plant */}
        <circle cx="40" cy="60" r="24" fill="url(#fernSheen)" />
      </g>
    </svg>
  )
}

export default Fern
