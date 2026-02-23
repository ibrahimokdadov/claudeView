import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import chokidar from 'chokidar'
import * as path from 'path'
import * as os from 'os'
import { readSessions } from './sessionReader'
import { IPC_CHANNELS } from '../shared/types'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl')
const TODOS_DIR = path.join(CLAUDE_DIR, 'todos')
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

let mainWindow: BrowserWindow | null = null
let greenhouseWindow: BrowserWindow | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

function sendSessions(): void {
  try {
    const sessions = readSessions()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.SESSIONS_UPDATE, sessions)
    }
    if (greenhouseWindow && !greenhouseWindow.isDestroyed()) {
      greenhouseWindow.webContents.send(IPC_CHANNELS.SESSIONS_UPDATE, sessions)
    }
  } catch (err) {
    console.error('Error reading sessions:', err)
  }
}

function scheduleSend(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    sendSessions()
    debounceTimer = null
  }, 300)
}

function createWindow(): void {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 380,
    height: 280,
    x: screenW - 400,
    y: screenH - 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    sendSessions()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createGreenhouseWindow(): void {
  if (greenhouseWindow && !greenhouseWindow.isDestroyed()) {
    greenhouseWindow.focus()
    return
  }

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  greenhouseWindow = new BrowserWindow({
    width: Math.min(1000, screenW - 100),
    height: Math.min(700, screenH - 100),
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    resizable: true,
    title: 'Claude Garden — Greenhouse',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  greenhouseWindow.on('ready-to-show', () => {
    sendSessions()
  })

  greenhouseWindow.on('closed', () => {
    greenhouseWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    greenhouseWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '?view=greenhouse')
  } else {
    greenhouseWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { view: 'greenhouse' },
    })
  }
}

function startWatcher(): void {
  const watchPaths = [HISTORY_FILE, TODOS_DIR, TASKS_DIR, PROJECTS_DIR]

  const watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  })

  watcher.on('change', scheduleSend)
  watcher.on('add', scheduleSend)
  watcher.on('unlink', scheduleSend)

  // 3-second polling fallback
  pollInterval = setInterval(sendSessions, 3000)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.claudeview')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on(IPC_CHANNELS.REQUEST_REFRESH, () => {
    sendSessions()
  })

  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
    mainWindow?.close()
  })

  ipcMain.on(IPC_CHANNELS.OPEN_GREENHOUSE, () => {
    createGreenhouseWindow()
  })

  ipcMain.on(IPC_CHANNELS.CLOSE_GREENHOUSE, () => {
    greenhouseWindow?.close()
  })

  createWindow()
  startWatcher()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (pollInterval) clearInterval(pollInterval)
  if (process.platform !== 'darwin') app.quit()
})
