import React from 'react'
import type { PlantProps } from './PlantProps'

const scaleMap = { sm: 0.6, md: 1, lg: 1.4 }

const SmallTree: React.FC<PlantProps> = ({ state, size = 'md', growth = 0.5 }) => {
  const s = scaleMap[size]
  const g = Math.max(0, Math.min(1, growth))

  const trunkWidth = 4 + g * 4
  const trunkHeight = 18 + g * 20
  const trunkTop = 85 - trunkHeight
  const canopyRadius = 8 + g * 12
  const showFruit = state === 'done'

  // Canopy is built from overlapping ellipses for organic look
  const canopyCx = 40
  const canopyCy = trunkTop - canopyRadius * 0.4

  // More sub-circles at higher growth
  const canopyCircles: React.ReactNode[] = []

  // Central canopy mass
  canopyCircles.push(
    <ellipse
      key="c-main"
      cx={canopyCx}
      cy={canopyCy}
      rx={canopyRadius}
      ry={canopyRadius * 0.85}
      fill="var(--plant-primary, #5b9a5f)"
    />
  )

  if (g > 0.3) {
    // Left lobe
    canopyCircles.push(
      <ellipse
        key="c-left"
        cx={canopyCx - canopyRadius * 0.55}
        cy={canopyCy + canopyRadius * 0.15}
        rx={canopyRadius * 0.7}
        ry={canopyRadius * 0.65}
        fill="var(--plant-primary, #5b9a5f)"
        opacity="0.9"
      />
    )
    // Right lobe
    canopyCircles.push(
      <ellipse
        key="c-right"
        cx={canopyCx + canopyRadius * 0.55}
        cy={canopyCy + canopyRadius * 0.15}
        rx={canopyRadius * 0.7}
        ry={canopyRadius * 0.65}
        fill="var(--plant-primary, #5b9a5f)"
        opacity="0.9"
      />
    )
  }

  if (g > 0.6) {
    // Top tuft
    canopyCircles.push(
      <ellipse
        key="c-top"
        cx={canopyCx}
        cy={canopyCy - canopyRadius * 0.55}
        rx={canopyRadius * 0.6}
        ry={canopyRadius * 0.5}
        fill="var(--plant-primary, #5b9a5f)"
        opacity="0.85"
      />
    )
  }

  if (g > 0.85) {
    // Extra side bulges
    canopyCircles.push(
      <ellipse
        key="c-extra-l"
        cx={canopyCx - canopyRadius * 0.35}
        cy={canopyCy - canopyRadius * 0.4}
        rx={canopyRadius * 0.5}
        ry={canopyRadius * 0.45}
        fill="var(--plant-primary, #5b9a5f)"
        opacity="0.8"
      />
    )
  }

  // Fruit positions
  const fruits: React.ReactNode[] = []
  if (showFruit) {
    const fruitPositions = [
      { x: canopyCx - 6, y: canopyCy + 4 },
      { x: canopyCx + 7, y: canopyCy + 2 },
      { x: canopyCx - 2, y: canopyCy - 5 },
      { x: canopyCx + 4, y: canopyCy + 7 },
    ]
    fruitPositions.forEach((pos, i) => {
      fruits.push(
        <circle
          key={`fruit-${i}`}
          className="bloom-particle"
          cx={pos.x}
          cy={pos.y}
          r="2.5"
          fill="var(--plant-bloom, #e87070)"
          opacity="0.9"
        />
      )
    })
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
        <linearGradient id="treeTrunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b6914" />
          <stop offset="40%" stopColor="#a07828" />
          <stop offset="100%" stopColor="#7a5c10" />
        </linearGradient>
        <radialGradient id="canopySheen" cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="canopyDepth" cx="0.5" cy="0.7" r="0.5">
          <stop offset="0%" stopColor="var(--plant-accent, #3d7a3f)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--plant-accent, #3d7a3f)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g data-state={state} className="plant-root">
        {/* Trunk */}
        <rect
          x={40 - trunkWidth / 2}
          y={trunkTop}
          width={trunkWidth}
          height={trunkHeight + 3}
          rx={trunkWidth * 0.25}
          fill="url(#treeTrunk)"
        />

        {/* Small branch stubs at medium+ growth */}
        {g > 0.4 && (
          <>
            <line
              x1={40 - trunkWidth / 2}
              y1={trunkTop + trunkHeight * 0.4}
              x2={40 - trunkWidth / 2 - 5}
              y2={trunkTop + trunkHeight * 0.3}
              stroke="#8b6914"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line
              x1={40 + trunkWidth / 2}
              y1={trunkTop + trunkHeight * 0.55}
              x2={40 + trunkWidth / 2 + 4}
              y2={trunkTop + trunkHeight * 0.45}
              stroke="#8b6914"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Canopy */}
        {canopyCircles}

        {/* Canopy depth shadow at bottom */}
        <ellipse
          cx={canopyCx}
          cy={canopyCy + canopyRadius * 0.4}
          rx={canopyRadius * 0.8}
          ry={canopyRadius * 0.3}
          fill="url(#canopyDepth)"
        />

        {/* Canopy highlight sheen */}
        <ellipse
          cx={canopyCx - canopyRadius * 0.15}
          cy={canopyCy - canopyRadius * 0.15}
          rx={canopyRadius * 0.9}
          ry={canopyRadius * 0.75}
          fill="url(#canopySheen)"
        />

        {/* Fruits */}
        {fruits}
      </g>
    </svg>
  )
}

export default SmallTree
