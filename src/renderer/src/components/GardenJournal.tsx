import React, { useMemo } from 'react'
import type { SessionInfo } from '../../../shared/types'
import { formatRelativeTime } from '../utils/time'

interface GardenJournalProps {
  sessions: SessionInfo[]
}

const STATUS_SYMBOLS: Record<string, string> = {
  working: '\u25B6',
  waiting: '\u25CE',
  idle:    '\u23F8',
  done:    '\u2713',
  error:   '\u2717',
}

function getActivityText(session: SessionInfo): string {
  if (session.currentTask) {
    return session.currentTask
  }
  if (session.currentAction.summary) {
    return session.currentAction.summary
  }
  if (session.currentAction.tool && session.currentAction.file) {
    return `${session.currentAction.tool} ${session.currentAction.file.replace(/\\/g, '/')}`
  }
  if (session.currentAction.tool) {
    return session.currentAction.tool
  }
  return '\u2014'
}

export function GardenJournal({ sessions }: GardenJournalProps): React.JSX.Element {
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.lastActivityAt - a.lastActivityAt),
    [sessions]
  )

  return (
    <div className="journal">
      <div className="journal-header">
        <span className="journal-header-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <line x1="4.5" y1="4" x2="9.5" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="4.5" y1="6.5" x2="9.5" y2="6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="4.5" y1="9" x2="7.5" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        <span className="journal-header-title">Garden Journal</span>
      </div>

      <div className="journal-log">
        {sortedSessions.length === 0 ? (
          <div className="journal-empty">No activity yet</div>
        ) : (
          sortedSessions.map((session) => {
            const symbol = STATUS_SYMBOLS[session.status] || '?'
            const time = formatRelativeTime(session.lastActivityAt)
            const activity = getActivityText(session)

            return (
              <div key={session.sessionId} className={`journal-entry journal-entry--${session.status}`}>
                <span className="journal-entry-time">{time}</span>
                <span className="journal-entry-project">{session.projectName}</span>
                <span className={`journal-entry-status journal-entry-status--${session.status}`}>
                  {symbol} {session.status}
                </span>
                <span className="journal-entry-separator">&mdash;</span>
                <span className="journal-entry-activity">{activity}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
