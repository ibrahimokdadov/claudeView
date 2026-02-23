import React, { useState } from 'react'
import type { SessionInfo } from '../../../shared/types'
import { GardenHeader } from './GardenHeader'
import { PlantPot } from './PlantPot'
import { DetailCard } from './DetailCard'
import { EmptyGarden } from './EmptyGarden'

interface GardenViewProps {
  sessions: SessionInfo[]
  onOpenGreenhouse: () => void
  onClose: () => void
  onRefresh: () => void
}

export function GardenView({ sessions, onOpenGreenhouse, onClose, onRefresh }: GardenViewProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = sessions.find((s) => s.sessionId === selectedId) || null

  return (
    <div className="garden">
      <GardenHeader
        count={sessions.length}
        onExpand={onOpenGreenhouse}
        onRefresh={onRefresh}
        onClose={onClose}
      />
      {sessions.length === 0 ? (
        <EmptyGarden />
      ) : (
        <>
          <div className="garden-shelf">
            <div className="garden-row">
              {sessions.map((session) => (
                <PlantPot
                  key={session.sessionId}
                  session={session}
                  isSelected={session.sessionId === selectedId}
                  onClick={() =>
                    setSelectedId((prev) => (prev === session.sessionId ? null : session.sessionId))
                  }
                />
              ))}
            </div>
            {/* Shelf surface */}
            <div className="garden-shelf-surface" />
          </div>
          {selected && <DetailCard session={selected} />}
        </>
      )}
    </div>
  )
}
