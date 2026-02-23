import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'
import type { SessionInfo } from '../shared/types'

const claudeViewAPI = {
  onSessionsUpdate: (callback: (sessions: SessionInfo[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessions: SessionInfo[]): void => {
      callback(sessions)
    }
    ipcRenderer.on(IPC_CHANNELS.SESSIONS_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SESSIONS_UPDATE, handler)
  },
  requestRefresh: () => {
    ipcRenderer.send(IPC_CHANNELS.REQUEST_REFRESH)
  },
  closeWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW)
  },
  openGreenhouse: () => {
    ipcRenderer.send(IPC_CHANNELS.OPEN_GREENHOUSE)
  },
  closeGreenhouse: () => {
    ipcRenderer.send(IPC_CHANNELS.CLOSE_GREENHOUSE)
  },
}

contextBridge.exposeInMainWorld('claudeView', claudeViewAPI)
