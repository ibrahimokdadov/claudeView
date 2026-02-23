import React, { useEffect, useState } from 'react'
import type { SessionInfo } from '../../shared/types'
import { GardenView } from './components/GardenView'
import { GreenhouseView } from './components/GreenhouseView'
import './App.css'
import './components/plants/plants.css'

function App(): React.JSX.Element {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const isGreenhouse = new URLSearchParams(window.location.search).get('view') === 'greenhouse'

  useEffect(() => {
    const unsubscribe = window.claudeView.onSessionsUpdate((newSessions) => {
      setSessions(newSessions)
    })
    window.claudeView.requestRefresh()
    return unsubscribe
  }, [])

  if (isGreenhouse) {
    return <GreenhouseView sessions={sessions} />
  }

  return (
    <GardenView
      sessions={sessions}
      onOpenGreenhouse={() => window.claudeView.openGreenhouse()}
      onClose={() => window.claudeView.closeWindow()}
      onRefresh={() => window.claudeView.requestRefresh()}
    />
  )
}

export default App
