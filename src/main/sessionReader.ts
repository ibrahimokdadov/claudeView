import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type { SessionInfo, Todo, SessionStatus, PlantType, CurrentAction, TaskEntry } from '../shared/types'

const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude')
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl')
const TODOS_DIR = path.join(CLAUDE_DIR, 'todos')
const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')

const MAX_AGE_MS = 24 * 60 * 60 * 1000      // 24 hours
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000 // 4 hours — only hide truly old idle sessions
const MAX_SESSIONS = 6
const TAIL_BYTES = 128 * 1024               // 128KB tail read for history
const ACTION_TAIL_BYTES = 4 * 1024          // 4KB tail read for current action

// ── Thresholds for mtime-based status ────────────────────────────────────
const WORKING_MS = 30_000        // < 30s since transcript write = working
const WAITING_MAX_MS = 10 * 60_000  // 10 min — max time to show "waiting" before assuming closed
// > 10 min with no transcript writes = idle (session likely closed)

// ── Types ───────────────────────────────────────────────────────────────

interface HistoryEntry {
  sessionId: string
  project?: string
  display?: string
  projectPath?: string
  cwd?: string
  timestamp: number
  message?: { role: string; content: string | { type: string; text: string }[] }
}

interface TasksDir {
  hasLock: boolean
  tasks: TaskEntry[]
}

// ── File helpers ─────────────────────────────────────────────────────────

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

// ── Process detection ────────────────────────────────────────────────────

let _cachedLiveSessions: Set<string> | null = null
let _cacheTime = 0
const PROCESS_CACHE_MS = 5_000 // cache for 5s to avoid spamming wmic

function getLiveSessionIds(): Set<string> {
  const now = Date.now()
  if (_cachedLiveSessions && now - _cacheTime < PROCESS_CACHE_MS) return _cachedLiveSessions

  const ids = new Set<string>()
  try {
    // wmic outputs UTF-16 — read as buffer and strip null bytes to get ASCII
    const buf = execSync(
      'wmic process where "name=\'node.exe\'" get CommandLine /FORMAT:LIST',
      { timeout: 5000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    const raw = buf.toString('utf8').replace(/\0/g, '')
    for (const line of raw.split('\n')) {
      if (!line.includes('claude-code')) continue
      const match = line.match(/--resume\s+([0-9a-f-]{36})/)
      if (match) {
        ids.add(match[1])
      } else {
        ids.add('__no_resume__')
      }
    }
  } catch { /* wmic failed — fall back to showing all */ }

  _cachedLiveSessions = ids
  _cacheTime = now
  return ids
}

// ── Transcript helpers ───────────────────────────────────────────────────

function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/[:\\\/]/g, '-')
}

function getTranscriptPath(sessionId: string, projectPath: string): string | null {
  if (!projectPath) return null
  const encoded = encodeProjectPath(projectPath)
  const p = path.join(PROJECTS_DIR, encoded, `${sessionId}.jsonl`)
  try { fs.statSync(p); return p } catch { return null }
}

function getTranscriptMtime(sessionId: string, projectPath: string): number {
  const p = getTranscriptPath(sessionId, projectPath)
  if (!p) return 0
  return fileMtimeMs(p) || 0
}

// Tools that prompt the user for input — these mean "waiting", not "working"
const USER_INPUT_TOOLS = new Set(['AskUserQuestion', 'ask_user_question'])

// Max time to trust AskUserQuestion as "waiting" before assuming closed (1 hour)
const ASK_USER_MAX_MS = 60 * 60_000

// Check if last transcript entry is specifically an AskUserQuestion (user prompt pending)
function isBlockedOnUserInput(sessionId: string, projectPath: string): boolean {
  const p = getTranscriptPath(sessionId, projectPath)
  if (!p) return false

  const raw = tailReadFile(p, ACTION_TAIL_BYTES)
  if (!raw) return false

  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      if (entry.type !== 'assistant' && entry.type !== 'user') continue
      if (entry.type === 'assistant') {
        const content = entry.message?.content
        if (!Array.isArray(content)) return false
        const toolUses = content.filter((b: { type: string }) => b.type === 'tool_use')
        return toolUses.length > 0 && toolUses.every(
          (b: { type: string; name?: string }) => USER_INPUT_TOOLS.has(b.name || '')
        )
      }
      return false // user entry = not blocked on input
    } catch { /* skip */ }
  }
  return false
}

// Check last transcript entry to determine if Claude is waiting for user
function isLastEntryAssistantText(sessionId: string, projectPath: string): boolean {
  const p = getTranscriptPath(sessionId, projectPath)
  if (!p) return false

  const raw = tailReadFile(p, ACTION_TAIL_BYTES)
  if (!raw) return false

  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      // Skip non-conversational entry types (progress, system, result, etc.)
      if (entry.type !== 'assistant' && entry.type !== 'user') continue
      if (entry.type === 'assistant') {
        const content = entry.message?.content
        if (!Array.isArray(content)) return true // pure text — Claude finished

        const toolUses = content.filter((b: { type: string }) => b.type === 'tool_use')
        // No tool uses = pure text response
        if (toolUses.length === 0) return true
        // All tool uses are user-input tools (AskUserQuestion) = waiting for user
        if (toolUses.every((b: { type: string; name?: string }) => USER_INPUT_TOOLS.has(b.name || ''))) return true
        return false  // active tool_use = still working
      }
      if (entry.type === 'user') return false // user message pending
    } catch { /* skip */ }
  }
  return false
}

// Check if last transcript entry has an error
// Note: system entries with subtype "api_error" are retryable and NOT real errors
function hasTranscriptError(sessionId: string, projectPath: string): boolean {
  const p = getTranscriptPath(sessionId, projectPath)
  if (!p) return false

  const raw = tailReadFile(p, ACTION_TAIL_BYTES)
  if (!raw) return false

  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      // Skip non-conversational types (progress, system, file-history-snapshot)
      // system api_error entries have an `error` field but are retryable — skip them
      if (entry.type !== 'assistant' && entry.type !== 'user') continue
      // Only flag error on actual conversational entries
      if (entry.error) return true
      return false
    } catch { /* skip */ }
  }
  return false
}

// ── Current action parser ────────────────────────────────────────────────

function parseCurrentAction(sessionId: string, projectPath: string): CurrentAction {
  const empty: CurrentAction = { tool: null, file: null, summary: null }
  const p = getTranscriptPath(sessionId, projectPath)
  if (!p) return empty

  const raw = tailReadFile(p, ACTION_TAIL_BYTES)
  if (!raw) return empty

  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      if (entry.type !== 'assistant') continue

      const content = entry.message?.content || entry.data?.message?.message?.content
      if (!Array.isArray(content)) continue

      // Find last tool_use block
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
    } catch { /* skip */ }
  }
  return empty
}

// ── History parser ───────────────────────────────────────────────────────

function parseHistoryEntries(): Map<string, {
  projectPath: string
  lastActivity: number
  firstActivity: number
  lastUserMessage: string
}> {
  const raw = tailReadFile(HISTORY_FILE)
  if (!raw) return new Map()

  const firstNewline = raw.indexOf('\n')
  const safeRaw = firstNewline >= 0 ? raw.slice(firstNewline + 1) : raw
  const sessionMap = new Map<string, {
    projectPath: string
    lastActivity: number
    firstActivity: number
    lastUserMessage: string
  }>()

  for (const line of safeRaw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry: HistoryEntry = JSON.parse(trimmed)
      if (!entry.sessionId) continue

      const projectPath = entry.project || entry.projectPath || entry.cwd || ''
      const ts = entry.timestamp
      const timestamp = typeof ts === 'number'
        ? ts > 1e12 ? ts : ts * 1000
        : Date.parse(String(ts))
      if (!timestamp || isNaN(timestamp)) continue

      const existing = sessionMap.get(entry.sessionId)

      let lastUserMessage = existing?.lastUserMessage || ''
      if (entry.display) {
        lastUserMessage = entry.display.slice(0, 120)
      } else if (entry.message?.role === 'user') {
        const c = entry.message.content
        if (typeof c === 'string') lastUserMessage = c.slice(0, 120)
        else if (Array.isArray(c)) {
          const t = c.find((b) => b.type === 'text')
          if (t?.text) lastUserMessage = t.text.slice(0, 120)
        }
      }

      if (!existing || timestamp > existing.lastActivity) {
        sessionMap.set(entry.sessionId, {
          projectPath: projectPath || existing?.projectPath || '',
          lastActivity: timestamp,
          firstActivity: existing?.firstActivity || timestamp,
          lastUserMessage,
        })
      } else {
        if (timestamp < existing.firstActivity) {
          existing.firstActivity = timestamp
        }
        if (lastUserMessage && !existing.lastUserMessage) {
          existing.lastUserMessage = lastUserMessage
        }
      }
    } catch { /* skip malformed */ }
  }

  return sessionMap
}

// ── Todos parser (.claude/todos/*.json) ─────────────────────────────────

function parseTodos(): Map<string, Todo[]> {
  const todoMap = new Map<string, Todo[]>()
  if (!fs.existsSync(TODOS_DIR)) return todoMap

  let files: string[]
  try { files = fs.readdirSync(TODOS_DIR) } catch { return todoMap }

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const match = file.match(/^(.+?)-agent-[^.]+\.json$/)
    if (!match) continue
    const sessionId = match[1]
    try {
      const raw = fs.readFileSync(path.join(TODOS_DIR, file), 'utf8')
      const todos: Todo[] = JSON.parse(raw)
      if (!Array.isArray(todos) || todos.length === 0) continue
      const existing = todoMap.get(sessionId) || []
      todoMap.set(sessionId, [...existing, ...todos])
    } catch { /* skip */ }
  }

  return todoMap
}

// ── Tasks dir reader (.claude/tasks/{sessionId}/) ─────────────────────

function readTasksDir(sessionId: string): TasksDir | null {
  const dirPath = path.join(TASKS_DIR, sessionId)
  if (!fs.existsSync(dirPath)) return null

  const hasLock = fs.existsSync(path.join(dirPath, '.lock'))

  let dirFiles: string[]
  try { dirFiles = fs.readdirSync(dirPath) } catch { return null }

  const tasks: TaskEntry[] = []
  for (const file of dirFiles) {
    if (!/^\d+\.json$/.test(file)) continue
    try {
      const raw = fs.readFileSync(path.join(dirPath, file), 'utf8')
      tasks.push(JSON.parse(raw) as TaskEntry)
    } catch { /* skip */ }
  }

  return { hasLock, tasks }
}

// ── Plant type assignment ────────────────────────────────────────────────

function getPlantType(projectPath: string): PlantType {
  const PLANT_TYPES: PlantType[] = ['succulent', 'fern', 'flower', 'smallTree', 'cactus']
  let hash = 0
  for (let i = 0; i < projectPath.length; i++) {
    hash = ((hash << 5) - hash + projectPath.charCodeAt(i)) | 0
  }
  return PLANT_TYPES[Math.abs(hash) % PLANT_TYPES.length]
}

// ── Status + task helpers ────────────────────────────────────────────────

function getProjectName(projectPath: string): string {
  if (!projectPath) return 'Unknown Project'
  const parts = projectPath.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || 'Unknown Project'
}

function deriveStatus(
  transcriptMtime: number,
  lastActivity: number,
  todos: Todo[],
  tasksDir: TasksDir | null,
  sessionId: string,
  projectPath: string
): SessionStatus {
  const now = Date.now()
  const transcriptAge = transcriptMtime > 0 ? now - transcriptMtime : Infinity
  const activityAge = now - lastActivity
  const allTasks = [...(tasksDir?.tasks || []), ...todos]

  // Check for errors first
  if (hasTranscriptError(sessionId, projectPath)) return 'error'

  // Transcript written within 30s = actively working (fresh writes = Claude is doing something)
  if (transcriptAge < WORKING_MS) return 'working'

  // ── Transcript is 30s–10min old: session is open, check what Claude is doing ──
  if (transcriptMtime > 0 && transcriptAge < WAITING_MAX_MS) {
    // Last transcript entry is assistant text or AskUserQuestion → waiting for user
    if (isLastEntryAssistantText(sessionId, projectPath)) return 'waiting'
    // Has a task lock and no assistant text → still processing between writes
    if (tasksDir?.hasLock) return 'working'
    // In-progress tasks + recent transcript = likely still working
    if (todos.some((t) => t.status === 'in_progress')) return 'working'
    if (tasksDir?.tasks.some((t) => t.status === 'in_progress')) return 'working'
    // Default: transcript stopped but not clear why — assume waiting
    return 'waiting'
  }

  // ── Transcript is >10min old: session is likely closed ──
  // Task files persist on disk after close — do NOT trust in_progress status here
  // Exception: AskUserQuestion means the session is genuinely waiting (up to 1 hour)
  if (transcriptMtime > 0 && transcriptAge >= WAITING_MAX_MS) {
    if (transcriptAge < ASK_USER_MAX_MS && isBlockedOnUserInput(sessionId, projectPath)) return 'waiting'
    if (allTasks.length > 0 && allTasks.every((t) => t.status === 'completed')) return 'done'
    return 'idle'
  }

  // ── No transcript at all — use history activity age as fallback ──
  if (activityAge < WAITING_MAX_MS) return 'waiting'
  return 'idle'
}

function getCurrentTask(todos: Todo[], tasksDir: TasksDir | null, fallback: string): string | null {
  if (tasksDir) {
    const t = tasksDir.tasks.find((t) => t.status === 'in_progress')
    if (t?.activeForm) return t.activeForm
    if (t?.subject) return t.subject
  }
  const t = todos.find((t) => t.status === 'in_progress')
  if (t?.activeForm) return t.activeForm
  return fallback || null
}

function getProgress(todos: Todo[], tasksDir: TasksDir | null): { completed: number; total: number } {
  if (tasksDir && tasksDir.tasks.length > 0) {
    return {
      total: tasksDir.tasks.length,
      completed: tasksDir.tasks.filter((t) => t.status === 'completed').length,
    }
  }
  return {
    total: todos.length,
    completed: todos.filter((t) => t.status === 'completed').length,
  }
}

// ── Main export ──────────────────────────────────────────────────────────

export function readSessions(): SessionInfo[] {
  const historyMap = parseHistoryEntries()
  const todoMap = parseTodos()
  const liveIds = getLiveSessionIds()
  const hasAnyLive = liveIds.size > 0
  const now = Date.now()
  const sessions: SessionInfo[] = []

  for (const [sessionId, histData] of historyMap) {
    if (now - histData.lastActivity > MAX_AGE_MS) continue

    // If we detected live processes, only show sessions that are actually running
    // liveIds contains session IDs from --resume flags
    // __no_resume__ marker means there are fresh sessions (no --resume) — allow recent sessions through
    const isLive = liveIds.has(sessionId)
    const hasFreshProcesses = liveIds.has('__no_resume__')
    const isRecent = (now - histData.lastActivity) < WAITING_MAX_MS
    if (hasAnyLive && !isLive && !(hasFreshProcesses && isRecent)) continue

    const todos = todoMap.get(sessionId) || []
    const tasksDir = readTasksDir(sessionId)
    const transcriptMtime = getTranscriptMtime(sessionId, histData.projectPath)

    const status = deriveStatus(transcriptMtime, histData.lastActivity, todos, tasksDir, sessionId, histData.projectPath)

    const currentTask = getCurrentTask(todos, tasksDir, histData.lastUserMessage)
    const currentAction = parseCurrentAction(sessionId, histData.projectPath)
    const { completed: completedTodos, total: totalTodos } = getProgress(todos, tasksDir)

    sessions.push({
      sessionId,
      projectName: getProjectName(histData.projectPath),
      projectPath: histData.projectPath,
      plantType: getPlantType(histData.projectPath),
      lastActivityAt: histData.lastActivity,
      transcriptMtimeMs: transcriptMtime,
      status,
      currentAction,
      currentTask,
      todos,
      tasks: tasksDir?.tasks || [],
      completedTodos,
      totalTodos,
      startedAt: histData.firstActivity,
      hasLock: tasksDir?.hasLock || false,
    })
  }

  // Deduplicate by project path — keep only the most recent session per project
  const byProject = new Map<string, SessionInfo>()
  for (const s of sessions) {
    const key = s.projectPath || s.sessionId
    const existing = byProject.get(key)
    if (!existing || s.lastActivityAt > existing.lastActivityAt) {
      byProject.set(key, s)
    }
  }

  return [...byProject.values()]
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
    .slice(0, MAX_SESSIONS)
}
