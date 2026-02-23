export interface Todo {
  // Actual field from .claude/todos/*.json
  content?: string
  // Fallback fields
  subject?: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm?: string
}

export type SessionStatus = 'working' | 'waiting' | 'idle' | 'done' | 'error'

export type PlantType = 'succulent' | 'fern' | 'flower' | 'smallTree' | 'cactus'

export interface CurrentAction {
  tool: string | null       // 'Read', 'Edit', 'Bash', 'Grep', etc.
  file: string | null       // file path being operated on
  summary: string | null    // human-readable one-liner
}

export interface TaskEntry {
  id: string
  subject?: string
  activeForm?: string
  status: 'pending' | 'in_progress' | 'completed'
  description?: string
}

export interface SessionInfo {
  sessionId: string
  projectName: string
  projectPath: string
  plantType: PlantType
  lastActivityAt: number         // unix ms
  transcriptMtimeMs: number      // raw mtime for frontend age calc
  status: SessionStatus
  currentAction: CurrentAction
  currentTask: string | null
  todos: Todo[]
  tasks: TaskEntry[]
  completedTodos: number
  totalTodos: number
  startedAt: number              // session start time
  hasLock: boolean
}

export const IPC_CHANNELS = {
  SESSIONS_UPDATE: 'sessions:update',
  REQUEST_REFRESH: 'sessions:requestRefresh',
  CLOSE_WINDOW: 'window:close',
  OPEN_GREENHOUSE: 'window:openGreenhouse',
  CLOSE_GREENHOUSE: 'window:closeGreenhouse',
} as const
