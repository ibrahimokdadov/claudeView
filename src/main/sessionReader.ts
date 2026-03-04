import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import * as os from 'os'
import type { SessionInfo, Todo, SessionStatus, PlantType, CurrentAction, TaskEntry } from '../shared/types'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl')
const TODOS_DIR = path.join(CLAUDE_DIR, 'todos')
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

const MAX_AGE_MS = 24 * 60 * 60 * 1000      // 24 hours — archive threshold
const TAIL_BYTES = 1024 * 1024               // 1MB tail for history
const ACTION_TAIL_BYTES = 64 * 1024          // 64KB tail for transcript analysis

// Status thresholds
const WORKING_MS = 30_000           // < 30s transcript age → working
const RECENT_MS = 5 * 60_000        // < 5min transcript age → use signal for w/w

// ── Types ────────────────────────────────────────────────────────────────

interface HistoryEntry {
  sessionId: string
  project?: string
  display?: string
  projectPath?: string
  cwd?: string
  timestamp: number
  message?: { role: string; content: string | { type: string; text: string }[] }
}

type TranscriptSignal =
  | 'tool_active'
  | 'thinking'
  | 'tool_result_pending'
  | 'user_message'
  | 'text_response'
  | 'user_input_requested'
  | 'error'
  | 'unknown'

interface RegistryEntry {
  sessionId: string
  project: string
  display: string
  firstSeen: number
  lastTranscriptMtime: number
  lastTranscriptSignal: TranscriptSignal
  transcriptPath: string | null
  processAlive: boolean
  pid?: number
  parentPid?: number
  tasks: TaskEntry[]
  todos: Todo[]
  currentAction: CurrentAction
  hasLock: boolean
  lastActivity: number
}

// ── In-Memory Registry ────────────────────────────────────────────────────

const sessionRegistry = new Map<string, RegistryEntry>()
let registryInitialized = false

function createEmptyEntry(sessionId: string, project: string, firstSeen: number): RegistryEntry {
  return {
    sessionId,
    project,
    display: '',
    firstSeen,
    lastTranscriptMtime: 0,
    lastTranscriptSignal: 'unknown',
    transcriptPath: null,
    processAlive: false,
    tasks: [],
    todos: [],
    currentAction: { tool: null, file: null, summary: null },
    hasLock: false,
    lastActivity: firstSeen,
  }
}

// ── File helpers ──────────────────────────────────────────────────────────

function tailReadFile(filePath: string, bytes = TAIL_BYTES): string {
  try {
    const stat = fs.statSync(filePath)
    if (stat.size === 0) return ''
    const readSize = Math.min(bytes, stat.size)
    const buf = Buffer.alloc(readSize)
    const fd = fs.openSync(filePath, 'r')
    try { fs.readSync(fd, buf, 0, readSize, stat.size - readSize) }
    finally { fs.closeSync(fd) }
    return buf.toString('utf8')
  } catch { return '' }
}

function fileMtimeMs(filePath: string): number | null {
  try { return fs.statSync(filePath).mtimeMs } catch { return null }
}

// ── Path helpers ──────────────────────────────────────────────────────────

function decodeProjectDir(dirName: string): string {
  return dirName.replace(/^([A-Z])--/, '$1:\\').replace(/-/g, '\\')
}

function getProjectName(projectPath: string): string {
  if (!projectPath) return 'Unknown Project'
  const parts = projectPath.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || 'Unknown Project'
}

function getPlantType(projectPath: string): PlantType {
  const PLANT_TYPES: PlantType[] = ['succulent', 'fern', 'flower', 'smallTree', 'cactus']
  let hash = 0
  for (let i = 0; i < projectPath.length; i++) {
    hash = ((hash << 5) - hash + projectPath.charCodeAt(i)) | 0
  }
  return PLANT_TYPES[Math.abs(hash) % PLANT_TYPES.length]
}

// ── Transcript signal reader ──────────────────────────────────────────────

const USER_INPUT_TOOLS = new Set(['AskUserQuestion', 'ask_user_question'])

function readTranscriptSignalFromPath(filePath: string): TranscriptSignal {
  const raw = tailReadFile(filePath, ACTION_TAIL_BYTES)
  if (!raw) return 'unknown'

  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      const role = entry.type === 'user' ? 'user'
        : entry.message?.role === 'assistant' ? 'assistant'
        : null
      if (!role) continue
      if (entry.error) return 'error'

      if (role === 'user') {
        const content = entry.message?.content
        if (Array.isArray(content)) {
          if (content.some((b: { type: string }) => b.type === 'tool_result')) return 'tool_result_pending'
        }
        return 'user_message'
      }

      if (role === 'assistant') {
        const content = entry.message?.content
        if (!Array.isArray(content)) return 'text_response'
        const blockTypes = new Set(content.map((b: { type: string }) => b.type))
        if (blockTypes.has('tool_use')) {
          const toolUses = content.filter((b: { type: string }) => b.type === 'tool_use')
          if (toolUses.every((b: { type: string; name?: string }) => USER_INPUT_TOOLS.has(b.name || ''))) {
            return 'user_input_requested'
          }
          return 'tool_active'
        }
        if (blockTypes.has('thinking')) return 'thinking'
        if (blockTypes.has('text')) return 'text_response'
        return 'unknown'
      }
    } catch { /* skip malformed */ }
  }
  return 'unknown'
}

// ── Current action parser ─────────────────────────────────────────────────

function parseCurrentActionFromPath(filePath: string): CurrentAction {
  const empty: CurrentAction = { tool: null, file: null, summary: null }
  const raw = tailReadFile(filePath, ACTION_TAIL_BYTES)
  if (!raw) return empty

  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      if (entry.type === 'assistant' || entry.message?.role === 'assistant') {
        const content = entry.message?.content || entry.data?.message?.message?.content
        if (!Array.isArray(content)) continue
        for (let j = content.length - 1; j >= 0; j--) {
          const block = content[j]
          if (block.type === 'tool_use') {
            const tool = block.name || null
            const input = block.input || {}
            const file = input.file_path || input.path || input.command?.slice(0, 80) || null
            const summary = tool ? `Using ${tool}${file ? ` on ${path.basename(String(file))}` : ''}` : null
            return { tool, file: file ? String(file) : null, summary }
          }
        }
      }
    } catch { /* skip */ }
  }
  return empty
}

// ── Status derivation ────────────────────────────────────────────────────

function deriveStatus(entry: RegistryEntry): SessionStatus {
  const now = Date.now()
  const transcriptAge = entry.lastTranscriptMtime > 0 ? now - entry.lastTranscriptMtime : Infinity
  const signal = entry.lastTranscriptSignal
  const allTasks = [...entry.tasks, ...entry.todos]

  if (signal === 'error') return 'error'

  if (entry.processAlive) {
    if (transcriptAge < WORKING_MS) return 'working'
    if (signal === 'tool_active' || signal === 'thinking' || signal === 'tool_result_pending' || signal === 'user_message') return 'working'
    if (signal === 'user_input_requested' || signal === 'text_response') return 'waiting'
    return 'waiting' // conservative: alive process with no/unknown transcript
  }

  // No confirmed process
  if (transcriptAge < WORKING_MS) return 'working'
  if (transcriptAge < RECENT_MS) {
    if (signal === 'tool_active' || signal === 'thinking' || signal === 'tool_result_pending' || signal === 'user_message') return 'working'
    return 'waiting'
  }

  if (allTasks.length > 0 && allTasks.every((t) => t.status === 'completed')) return 'done'
  return 'idle'
}

// ── Task helpers ──────────────────────────────────────────────────────────

function getCurrentTask(todos: Todo[], tasks: TaskEntry[], fallback: string): string | null {
  if (tasks.length > 0) {
    const t = tasks.find((t) => t.status === 'in_progress')
    if (t?.activeForm) return t.activeForm
    if (t?.subject) return t.subject
  }
  const t = todos.find((t) => t.status === 'in_progress')
  if (t?.activeForm) return t.activeForm
  return fallback || null
}

function getProgress(todos: Todo[], tasks: TaskEntry[]): { completed: number; total: number } {
  if (tasks.length > 0) {
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    }
  }
  return {
    total: todos.length,
    completed: todos.filter((t) => t.status === 'completed').length,
  }
}

// ── WMI helpers ───────────────────────────────────────────────────────────

const CLAUDE_CMD_PATTERNS = [
  /claude-code/i,
  /@anthropic-ai[/\\]claude/i,
  /\bclaude\.exe\b/i,
  /\bclaude\b.*\bcli\.js\b/i,
]
const CLAUDE_EXCLUDE_PATTERNS = [
  /\bmcp\b.*\bserve\b/i,
  /\bmcp\b.*\bstart\b/i,
]

function isClaudeProcess(cmdline: string): boolean {
  if (!CLAUDE_CMD_PATTERNS.some((p) => p.test(cmdline))) return false
  if (CLAUDE_EXCLUDE_PATTERNS.some((p) => p.test(cmdline))) return false
  return true
}

function parseWmicRecord(record: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of record.split(/\r?\n/)) {
    const trimmed = line.trim()
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      fields[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
    }
  }
  return fields
}

function parseWmiDate(wmiDate: string): number | null {
  if (!wmiDate) return null
  const m = wmiDate.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!m) return null
  return new Date(
    parseInt(m[1]),
    parseInt(m[2]) - 1,
    parseInt(m[3]),
    parseInt(m[4]),
    parseInt(m[5]),
    parseInt(m[6])
  ).getTime()
}

// ── Registry initialization helpers ──────────────────────────────────────

function scanAndRegisterTranscripts(): void {
  let projectDirs: string[]
  try { projectDirs = fs.readdirSync(PROJECTS_DIR) } catch { return }

  for (const dirName of projectDirs) {
    if (dirName === 'subagents') continue
    const dirPath = path.join(PROJECTS_DIR, dirName)
    let stat: fs.Stats
    try { stat = fs.statSync(dirPath) } catch { continue }
    if (!stat.isDirectory()) continue

    let files: string[]
    try { files = fs.readdirSync(dirPath) } catch { continue }

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue
      const sessionId = file.slice(0, -6)
      if (sessionId.startsWith('agent-')) continue
      handleTranscriptChange(path.join(dirPath, file))
    }
  }
}

function scanAndRegisterTodos(): void {
  if (!fs.existsSync(TODOS_DIR)) return
  let files: string[]
  try { files = fs.readdirSync(TODOS_DIR) } catch { return }
  for (const file of files) {
    if (file.endsWith('.json')) handleTodosChange(path.join(TODOS_DIR, file))
  }
}

function scanAndRegisterTasks(): void {
  if (!fs.existsSync(TASKS_DIR)) return
  let dirs: string[]
  try { dirs = fs.readdirSync(TASKS_DIR) } catch { return }
  for (const sessionDir of dirs) {
    const dirPath = path.join(TASKS_DIR, sessionDir)
    let files: string[]
    try { files = fs.readdirSync(dirPath) } catch { continue }
    const jsonFile = files.find((f) => /^\d+\.json$/.test(f))
    if (jsonFile) handleTasksChange(path.join(dirPath, jsonFile))
  }
}

// ── Event handlers (exported for use in index.ts) ─────────────────────────

export function handleTranscriptChange(filePath: string): void {
  const fileName = path.basename(filePath, '.jsonl')
  // Skip agent transcripts and non-UUID filenames
  if (fileName.startsWith('agent-')) return
  if (!fileName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return

  const dirName = path.basename(path.dirname(filePath))
  if (dirName === 'subagents') return

  const sessionId = fileName
  const projectPath = decodeProjectDir(dirName)
  const mtime = fileMtimeMs(filePath) || Date.now()

  let entry = sessionRegistry.get(sessionId)
  if (!entry) {
    entry = createEmptyEntry(sessionId, projectPath, mtime)
    sessionRegistry.set(sessionId, entry)
  }

  entry.transcriptPath = filePath
  entry.lastTranscriptMtime = mtime
  entry.lastActivity = Math.max(entry.lastActivity, mtime)

  entry.lastTranscriptSignal = readTranscriptSignalFromPath(filePath)
  entry.currentAction = parseCurrentActionFromPath(filePath)
}

export function handleHistoryChange(): void {
  const raw = tailReadFile(HISTORY_FILE)
  if (!raw) return

  const firstNewline = raw.indexOf('\n')
  const safeRaw = firstNewline >= 0 ? raw.slice(firstNewline + 1) : raw

  for (const line of safeRaw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const histEntry: HistoryEntry = JSON.parse(trimmed)
      if (!histEntry.sessionId) continue

      const projectPath = histEntry.project || histEntry.projectPath || histEntry.cwd || ''
      const ts = histEntry.timestamp
      const timestamp = typeof ts === 'number'
        ? ts > 1e12 ? ts : ts * 1000
        : Date.parse(String(ts))
      if (!timestamp || isNaN(timestamp)) continue

      let entry = sessionRegistry.get(histEntry.sessionId)
      if (!entry) {
        entry = createEmptyEntry(histEntry.sessionId, projectPath, timestamp)
        sessionRegistry.set(histEntry.sessionId, entry)
      }

      if (timestamp > entry.lastActivity) {
        entry.lastActivity = timestamp
        if (projectPath) entry.project = projectPath
      }
      if (timestamp < entry.firstSeen) {
        entry.firstSeen = timestamp
      }

      // Update display text from history
      if (histEntry.display && timestamp >= entry.lastActivity) {
        entry.display = histEntry.display.slice(0, 120)
      } else if (histEntry.message?.role === 'user') {
        const c = histEntry.message.content
        if (typeof c === 'string' && !entry.display) entry.display = c.slice(0, 120)
        else if (Array.isArray(c) && !entry.display) {
          const t = c.find((b) => b.type === 'text')
          if (t?.text) entry.display = t.text.slice(0, 120)
        }
      }
    } catch { /* skip malformed */ }
  }
}

export function handleTodosChange(filePath: string): void {
  const file = path.basename(filePath)
  if (!file.endsWith('.json')) return
  const match = file.match(/^(.+?)-agent-[^.]+\.json$/)
  if (!match) return

  const sessionId = match[1]
  const entry = sessionRegistry.get(sessionId)
  if (!entry) return

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const todos: Todo[] = JSON.parse(raw)
    if (Array.isArray(todos)) entry.todos = todos
  } catch { /* skip */ }
}

export function handleTasksChange(filePath: string): void {
  const dirPath = path.dirname(filePath)
  const sessionId = path.basename(dirPath)
  const entry = sessionRegistry.get(sessionId)
  if (!entry) return

  entry.hasLock = fs.existsSync(path.join(dirPath, '.lock'))

  let files: string[]
  try { files = fs.readdirSync(dirPath) } catch { return }

  const tasks: TaskEntry[] = []
  for (const file of files) {
    if (!/^\d+\.json$/.test(file)) continue
    try {
      const raw = fs.readFileSync(path.join(dirPath, file), 'utf8')
      tasks.push(JSON.parse(raw) as TaskEntry)
    } catch { /* skip */ }
  }
  entry.tasks = tasks
}

// ── Process detection (called on 5s interval) ─────────────────────────────

export function updateProcessDetection(): void {
  try {
    const buf = execSync(
      'wmic process where "name=\'node.exe\' or name=\'claude.exe\'" get ProcessId,ParentProcessId,CommandLine,CreationDate /FORMAT:LIST',
      { timeout: 5000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    // Normalize line endings: WMI on some Windows versions outputs \r\r\n instead of \r\n
    const raw = buf.toString('utf8').replace(/\0/g, '').replace(/\r\r/g, '\r')

    // Reset all process alive flags before fresh detection
    for (const entry of sessionRegistry.values()) {
      entry.processAlive = false
      entry.pid = undefined
      entry.parentPid = undefined
    }

    const unmatchedProcs: { pid: number; parentPid: number; creationTime: number }[] = []

    for (const record of raw.split(/\r?\n\r?\n/)) {
      const fields = parseWmicRecord(record)
      const cmdline = fields['CommandLine']
      if (!cmdline || !isClaudeProcess(cmdline)) continue

      const pid = parseInt(fields['ProcessId'], 10) || 0
      const parentPid = parseInt(fields['ParentProcessId'], 10) || 0
      const creationTime = parseWmiDate(fields['CreationDate'] || '') || 0

      const resumeMatch = cmdline.match(/--resume\s+([0-9a-f-]{36})/)
      const sessionMatch = cmdline.match(/--session-id\s+([0-9a-f-]{36})/)
      const matchedId = resumeMatch?.[1] || sessionMatch?.[1]

      if (matchedId) {
        const entry = sessionRegistry.get(matchedId)
        if (entry) {
          entry.processAlive = true
          entry.pid = pid
          entry.parentPid = parentPid
        }
      } else if (pid && parentPid) {
        unmatchedProcs.push({ pid, parentPid, creationTime })
      }
    }

    // Link unmatched (-c flag) processes via mtime correlation
    for (const proc of unmatchedProcs) {
      if (!proc.creationTime) continue

      let bestEntry: RegistryEntry | null = null
      let bestDiff = Infinity

      for (const entry of sessionRegistry.values()) {
        if (entry.processAlive) continue
        const mtime = entry.lastTranscriptMtime
        if (!mtime) continue

        // Transcript should be written within [processStart - 10s, processStart + 60s]
        const diff = mtime - proc.creationTime
        if (diff >= -10_000 && diff <= 60_000) {
          if (Math.abs(diff) < bestDiff) {
            bestDiff = Math.abs(diff)
            bestEntry = entry
          }
        }
      }

      if (bestEntry) {
        bestEntry.processAlive = true
        bestEntry.pid = proc.pid
        bestEntry.parentPid = proc.parentPid
      }
    }
  } catch {
    // wmic failed — leave processAlive flags unchanged
  }
}

// ── Registry init ─────────────────────────────────────────────────────────

export function initRegistry(): void {
  if (registryInitialized) return
  registryInitialized = true
  handleHistoryChange()
  scanAndRegisterTranscripts()
  scanAndRegisterTodos()
  scanAndRegisterTasks()
  updateProcessDetection()
}

// ── Main export ───────────────────────────────────────────────────────────

export function getSessions(): SessionInfo[] {
  if (!registryInitialized) initRegistry()

  const now = Date.now()
  const sessions: SessionInfo[] = []

  for (const entry of sessionRegistry.values()) {
    const archived = !entry.processAlive && (now - entry.lastActivity > MAX_AGE_MS)
    const status = deriveStatus(entry)
    const { completed, total } = getProgress(entry.todos, entry.tasks)

    sessions.push({
      sessionId: entry.sessionId,
      projectName: getProjectName(entry.project),
      projectPath: entry.project,
      plantType: getPlantType(entry.project),
      lastActivityAt: entry.lastActivity,
      transcriptMtimeMs: entry.lastTranscriptMtime,
      status,
      currentAction: entry.currentAction,
      currentTask: getCurrentTask(entry.todos, entry.tasks, entry.display),
      todos: entry.todos,
      tasks: entry.tasks,
      completedTodos: completed,
      totalTodos: total,
      startedAt: entry.firstSeen,
      hasLock: entry.hasLock,
      processPid: entry.pid,
      parentPid: entry.parentPid,
      archived,
    })
  }

  return sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt)
}
