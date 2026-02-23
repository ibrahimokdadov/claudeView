import React from 'react'
import type { SessionInfo } from '../../../shared/types'
import { GreenhousePlantCard } from './GreenhousePlantCard'
import { GardenJournal } from './GardenJournal'

interface GreenhouseViewProps {
  sessions: SessionInfo[]
}

export function GreenhouseView({ sessions }: GreenhouseViewProps): React.JSX.Element {
  if (sessions.length === 0) {
    return (
      <div className="greenhouse">
        <div className="greenhouse-header">
          <div className="greenhouse-header-left">
            <svg className="greenhouse-header-leaf" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M3 19C3 19 5 7 16 3C16 3 17 14 8 17C8 17 12 13 14 8"
                stroke="var(--plant-green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <h1 className="greenhouse-title">The Greenhouse</h1>
          </div>
        </div>

        <div className="greenhouse-empty">
          <svg width="160" height="100" viewBox="0 0 160 100" fill="none" className="greenhouse-empty-svg">
            {/* Greenhouse frame */}
            <path
              d="M20 90 L20 40 L80 15 L140 40 L140 90"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
            />
            {/* Roof arc */}
            <path
              d="M20 40 Q80 5 140 40"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Ground */}
            <rect x="15" y="88" width="130" height="6" rx="3" fill="rgba(139, 90, 43, 0.2)" />
            {/* Empty pots */}
            <path d="M45 70 L42 86 L58 86 L55 70 Z" fill="rgba(194, 149, 106, 0.25)" />
            <rect x="41" y="67" width="18" height="4" rx="2" fill="rgba(194, 149, 106, 0.3)" />
            <path d="M75 70 L72 86 L88 86 L85 70 Z" fill="rgba(194, 149, 106, 0.25)" />
            <rect x="71" y="67" width="18" height="4" rx="2" fill="rgba(194, 149, 106, 0.3)" />
            <path d="M105 70 L102 86 L118 86 L115 70 Z" fill="rgba(194, 149, 106, 0.25)" />
            <rect x="101" y="67" width="18" height="4" rx="2" fill="rgba(194, 149, 106, 0.3)" />
            {/* Sunlight rays */}
            <line x1="80" y1="5" x2="80" y2="12" stroke="rgba(251,191,36,0.15)" strokeWidth="1" />
            <line x1="65" y1="8" x2="68" y2="14" stroke="rgba(251,191,36,0.1)" strokeWidth="1" />
            <line x1="95" y1="8" x2="92" y2="14" stroke="rgba(251,191,36,0.1)" strokeWidth="1" />
          </svg>
          <div className="greenhouse-empty-title">Your greenhouse is quiet</div>
          <div className="greenhouse-empty-subtitle">
            Start a Claude Code session and watch your garden grow
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="greenhouse">
      <div className="greenhouse-header">
        <div className="greenhouse-header-left">
          <svg className="greenhouse-header-leaf" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M3 19C3 19 5 7 16 3C16 3 17 14 8 17C8 17 12 13 14 8"
              stroke="var(--plant-green)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <h1 className="greenhouse-title">The Greenhouse</h1>
          <span className="greenhouse-count">{sessions.length} {sessions.length === 1 ? 'plant' : 'plants'}</span>
        </div>
      </div>

      <div className="greenhouse-body">
        <div className="greenhouse-grid">
          {sessions.map((session) => (
            <GreenhousePlantCard key={session.sessionId} session={session} />
          ))}
        </div>

        <div className="greenhouse-journal-section">
          <GardenJournal sessions={sessions} />
        </div>
      </div>
    </div>
  )
}
