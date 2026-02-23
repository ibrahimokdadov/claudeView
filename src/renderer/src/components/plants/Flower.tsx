import React from 'react'
import type { PlantProps } from './PlantProps'

const scaleMap = { sm: 0.6, md: 1, lg: 1.4 }

const Flower: React.FC<PlantProps> = ({ state, size = 'md', growth = 0.5 }) => {
  const s = scaleMap[size]
  const g = Math.max(0, Math.min(1, growth))

  const stemTop = 82 - g * 48 // stem grows upward with growth
  const showBud = g >= 0.4
  const showPetals = g >= 0.7
  const fullBloom = state === 'done'
  const petalCount = fullBloom ? 6 : showPetals ? 4 : 0
  const petalSize = fullBloom ? 9 : 6

  // Leaf positions along the stem
  const leaves: React.ReactNode[] = []
  const stemLength = 82 - stemTop
  if (stemLength > 10) {
    // Left leaf
    const ly1 = 82 - stemLength * 0.35
    leaves.push(
      <path
        key="leaf-l"
        d={`M40,${ly1} Q28,${ly1 - 8} 24,${ly1 - 2} Q30,${ly1 + 2} 40,${ly1}`}
        fill="var(--plant-primary, #5b9a5f)"
        stroke="var(--plant-accent, #4a8050)"
        strokeWidth="0.4"
      />
    )
  }
  if (stemLength > 22) {
    // Right leaf (higher)
    const ly2 = 82 - stemLength * 0.6
    leaves.push(
      <path
        key="leaf-r"
        d={`M40,${ly2} Q52,${ly2 - 7} 56,${ly2 - 1} Q50,${ly2 + 2} 40,${ly2}`}
        fill="var(--plant-primary, #5b9a5f)"
        stroke="var(--plant-accent, #4a8050)"
        strokeWidth="0.4"
      />
    )
  }
  if (stemLength > 35 && g > 0.6) {
    // Small left leaf near top
    const ly3 = 82 - stemLength * 0.8
    leaves.push(
      <path
        key="leaf-l2"
        d={`M40,${ly3} Q32,${ly3 - 5} 30,${ly3 - 1} Q34,${ly3 + 1} 40,${ly3}`}
        fill="var(--plant-primary, #5b9a5f)"
        opacity="0.85"
      />
    )
  }

  // Generate petals around the flower head
  const petals: React.ReactNode[] = []
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2
    const px = 40 + Math.cos(angle) * petalSize
    const py = stemTop + Math.sin(angle) * petalSize * 0.8
    const rotation = (angle * 180) / Math.PI

    petals.push(
      <ellipse
        key={`petal-${i}`}
        cx={px}
        cy={py}
        rx={petalSize * 0.55}
        ry={petalSize * 0.35}
        transform={`rotate(${rotation}, ${px}, ${py})`}
        fill="var(--plant-bloom, #e87da0)"
        opacity={fullBloom ? 0.9 : 0.7}
        stroke="var(--plant-bloom, #e87da0)"
        strokeWidth="0.3"
        strokeOpacity="0.5"
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
        <radialGradient id="flowerCenter" cx="0.45" cy="0.4" r="0.55">
          <stop offset="0%" stopColor="#f5d76e" />
          <stop offset="100%" stopColor="#e8b830" />
        </radialGradient>
        <radialGradient id="petalSheen" cx="0.3" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g data-state={state} className="plant-root">
        {/* Stem — slight curve for organic feel */}
        <path
          d={`M40,85 Q38,${stemTop + (82 - stemTop) * 0.5} 40,${stemTop}`}
          fill="none"
          stroke="var(--plant-accent, #4a8050)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Leaves along stem */}
        {leaves}

        {/* Petals */}
        {petals}

        {/* Bud or center */}
        {showBud && !showPetals && (
          <ellipse
            cx="40"
            cy={stemTop}
            rx="4"
            ry="6"
            fill="var(--plant-bloom, #e87da0)"
            opacity="0.7"
          />
        )}

        {/* Flower center (pistil) */}
        {showPetals && (
          <>
            <circle cx="40" cy={stemTop} r={fullBloom ? 4.5 : 3} fill="url(#flowerCenter)" />
            <circle cx="40" cy={stemTop} r={fullBloom ? 4.5 : 3} fill="url(#petalSheen)" />
          </>
        )}

        {/* Bloom particles for done state */}
        {fullBloom && (
          <>
            <circle className="bloom-particle" cx="32" cy={stemTop - 6} r="1.5" fill="var(--plant-bloom, #e87da0)" opacity="0.6" />
            <circle className="bloom-particle" cx="48" cy={stemTop - 4} r="1.2" fill="var(--plant-bloom, #e87da0)" opacity="0.5" />
            <circle className="bloom-particle" cx="35" cy={stemTop + 10} r="1" fill="var(--plant-bloom, #e87da0)" opacity="0.4" />
          </>
        )}
      </g>
    </svg>
  )
}

export default Flower
