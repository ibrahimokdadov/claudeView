/// <reference types="vite/client" />
import type { SessionInfo } from '../../shared/types'

interface ClaudeViewAPI {
  onSessionsUpdate: (callback: (sessions: SessionInfo[]) => void) => () => void
  requestRefresh: () => void
  closeWindow: () => void
  openGreenhouse: () => void
  closeGreenhouse: () => void
}

declare global {
  interface Window {
    claudeView: ClaudeViewAPI
  }
}
