import React from 'react'
import type { PlantProps } from './PlantProps'

const scaleMap = { sm: 0.6, md: 1, lg: 1.4 }

const Cactus: React.FC<PlantProps> = ({ state, size = 'md', growth = 0.5 }) => {
  const s = scaleMap[size]
  const g = Math.max(0, Math.min(1, growth))

  const bodyWidth = 12 + g * 4
  const bodyHeight = 28 + g * 18
  const bodyTop = 84 - bodyHeight
  const bodyCx = 40
  const showArm1 = g >= 0.45
  const showArm2 = g >= 0.75
  const showFlower = state === 'done'

  // Spine positions along the body
  const spines: React.ReactNode[] = []
  const spineCount = Math.floor(4 + g * 6)
  for (let i = 0; i < spineCount; i++) {
    const t = (i + 1) / (spineCount + 1)
    const sy = bodyTop + bodyHeight * t
    const side = i % 2 === 0 ? -1 : 1
    const sx = bodyCx + side * (bodyWidth / 2 + 0.5)
    const spineLen = 3 + ((i * 7 + 13) % 5) * 0.4

    spines.push(
      <line
        key={`spine-${i}`}
        x1={sx}
        y1={sy}
        x2={sx + side * spineLen}
        y2={sy - 1.5}
        stroke="var(--plant-accent, #c4c88a)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    )
  }

  // Vertical ribs on the body
  const ribs: React.ReactNode[] = []
  const ribCount = 3
  for (let i = 0; i < ribCount; i++) {
    const offset = ((i + 1) / (ribCount + 1)) * bodyWidth - bodyWidth / 2
    ribs.push(
      <line
        key={`rib-${i}`}
        x1={bodyCx + offset}
        y1={bodyTop + 4}
        x2={bodyCx + offset}
        y2={bodyTop + bodyHeight - 2}
        stroke="var(--plant-accent, #3d7a46)"
        strokeWidth="0.5"
        opacity="0.3"
        strokeLinecap="round"
      />
    )
  }

  // Arm 1: right side, going up
  const arm1Base = bodyTop + bodyHeight * 0.45
  const arm1Width = 7
  const arm1Height = 16 + g * 6

  // Arm 2: left side, shorter
  const arm2Base = bodyTop + bodyHeight * 0.6
  const arm2Width = 6
  const arm2Height = 10 + g * 4

  return (
    <svg
      viewBox="0 0 80 100"
      width={80 * s}
      height={100 * s}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="cactusBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--plant-accent, #3d7a46)" />
          <stop offset="35%" stopColor="var(--plant-primary, #5b9a5f)" />
          <stop offset="100%" stopColor="var(--plant-accent, #3d7a46)" />
        </linearGradient>
        <radialGradient id="cactusSheen" cx="0.35" cy="0.25" r="0.65">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g data-state={state} className="plant-root">
        {/* Right arm */}
        {showArm1 && (
          <path
            d={`
              M${bodyCx + bodyWidth / 2},${arm1Base}
              L${bodyCx + bodyWidth / 2 + 10},${arm1Base}
              Q${bodyCx + bodyWidth / 2 + 10 + arm1Width / 2},${arm1Base} ${bodyCx + bodyWidth / 2 + 10 + arm1Width / 2},${arm1Base - 4}
              L${bodyCx + bodyWidth / 2 + 10 + arm1Width / 2},${arm1Base - arm1Height}
              Q${bodyCx + bodyWidth / 2 + 10 + arm1Width / 2},${arm1Base - arm1Height - arm1Width / 2} ${bodyCx + bodyWidth / 2 + 10},${arm1Base - arm1Height - arm1Width / 2}
              Q${bodyCx + bodyWidth / 2 + 10 - arm1Width / 2},${arm1Base - arm1Height - arm1Width / 2} ${bodyCx + bodyWidth / 2 + 10 - arm1Width / 2},${arm1Base - arm1Height}
              L${bodyCx + bodyWidth / 2 + 10 - arm1Width / 2},${arm1Base - 2}
              L${bodyCx + bodyWidth / 2},${arm1Base - 2}
              Z
            `}
            fill="url(#cactusBody)"
            stroke="var(--plant-accent, #3d7a46)"
            strokeWidth="0.3"
          />
        )}

        {/* Left arm */}
        {showArm2 && (
          <path
            d={`
              M${bodyCx - bodyWidth / 2},${arm2Base}
              L${bodyCx - bodyWidth / 2 - 8},${arm2Base}
              Q${bodyCx - bodyWidth / 2 - 8 - arm2Width / 2},${arm2Base} ${bodyCx - bodyWidth / 2 - 8 - arm2Width / 2},${arm2Base - 3}
              L${bodyCx - bodyWidth / 2 - 8 - arm2Width / 2},${arm2Base - arm2Height}
              Q${bodyCx - bodyWidth / 2 - 8 - arm2Width / 2},${arm2Base - arm2Height - arm2Width / 2} ${bodyCx - bodyWidth / 2 - 8},${arm2Base - arm2Height - arm2Width / 2}
              Q${bodyCx - bodyWidth / 2 - 8 + arm2Width / 2},${arm2Base - arm2Height - arm2Width / 2} ${bodyCx - bodyWidth / 2 - 8 + arm2Width / 2},${arm2Base - arm2Height}
              L${bodyCx - bodyWidth / 2 - 8 + arm2Width / 2},${arm2Base - 2}
              L${bodyCx - bodyWidth / 2},${arm2Base - 2}
              Z
            `}
            fill="url(#cactusBody)"
            stroke="var(--plant-accent, #3d7a46)"
            strokeWidth="0.3"
          />
        )}

        {/* Main body — tall rounded rectangle */}
        <rect
          x={bodyCx - bodyWidth / 2}
          y={bodyTop}
          width={bodyWidth}
          height={bodyHeight}
          rx={bodyWidth / 2}
          ry={bodyWidth / 2}
          fill="url(#cactusBody)"
        />

        {/* Body sheen */}
        <rect
          x={bodyCx - bodyWidth / 2}
          y={bodyTop}
          width={bodyWidth}
          height={bodyHeight}
          rx={bodyWidth / 2}
          ry={bodyWidth / 2}
          fill="url(#cactusSheen)"
        />

        {/* Vertical ribs */}
        {ribs}

        {/* Spines */}
        {spines}

        {/* Flower on top when done */}
        {showFlower && (
          <g>
            {/* Flower petals */}
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const rad = (deg * Math.PI) / 180
              const px = bodyCx + Math.cos(rad) * 5
              const py = bodyTop - 2 + Math.sin(rad) * 4
              return (
                <ellipse
                  key={`fpetal-${deg}`}
                  className="bloom-particle"
                  cx={px}
                  cy={py}
                  rx="3.5"
                  ry="2"
                  transform={`rotate(${deg}, ${px}, ${py})`}
                  fill="var(--plant-bloom, #e87da0)"
                  opacity="0.85"
                />
              )
            })}
            {/* Center */}
            <circle cx={bodyCx} cy={bodyTop - 2} r="2.5" fill="#f5d76e" />
          </g>
        )}
      </g>
    </svg>
  )
}

export default Cactus
