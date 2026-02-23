import React from 'react'
import type { SessionInfo } from '../../../shared/types'
import { getPlantComponent, Pot } from './plants'

interface PlantPotProps {
  session: SessionInfo
  isSelected: boolean
  onClick: () => void
}

export function PlantPot({ session, isSelected, onClick }: PlantPotProps): React.JSX.Element {
  const { plantType, status, projectName, completedTodos, totalTodos } = session
  const Plant = getPlantComponent(plantType)

  // Growth = plan progress if tasks exist, otherwise time-based (grows over first 2 hours)
  let growth: number
  if (totalTodos > 0) {
    growth = completedTodos / totalTodos
  } else {
    const ageMin = (Date.now() - session.startedAt) / 60_000
    growth = Math.min(0.85, 0.15 + (ageMin / 120) * 0.7)
  }

  // Circular progress arc
  const progressPct = totalTodos > 0 ? completedTodos / totalTodos : 0
  const circumference = 2 * Math.PI * 10
  const dashOffset = circumference * (1 - progressPct)

  return (
    <button
      className={`plant-pot-wrapper ${isSelected ? 'plant-pot-wrapper--selected' : ''}`}
      onClick={onClick}
      title={`${projectName} — ${status}`}
    >
      <div className="plant-pot-plant">
        <Plant state={status} size="sm" growth={growth} />
        {status === 'waiting' && (
          <div className="plant-pot-attention">
            <span className="plant-pot-attention-dot" />
          </div>
        )}
      </div>
      <Pot size="sm" label={projectName} />

      <span className="plant-pot-name">{projectName}</span>

      {/* Tiny progress ring */}
      {totalTodos > 0 && (
        <svg className="plant-pot-progress" width="24" height="24" viewBox="0 0 24 24">
          <circle
            cx="12" cy="12" r="10"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          <circle
            cx="12" cy="12" r="10"
            fill="none"
            stroke="var(--plant-green)"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          <text
            x="12" y="12.5"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize="7"
            fontWeight="600"
          >
            {completedTodos}/{totalTodos}
          </text>
        </svg>
      )}
    </button>
  )
}
