import React from 'react'
import type { SessionInfo } from '../../../shared/types'
import { formatRelativeTime } from '../utils/time'

interface DetailCardProps {
  session: SessionInfo
}

const STATUS_LABELS: Record<string, string> = {
  working: 'Working',
  waiting: 'Waiting',
  idle: 'Idle',
  done: 'Done',
  error: 'Error',
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📖',
  Edit: '✏️',
  Write: '📝',
  Bash: '⚡',
  Grep: '🔍',
  Glob: '📂',
  Task: '🔀',
  WebFetch: '🌐',
  WebSearch: '🔎',
}

function formatDuration(startMs: number): string {
  const diff = Date.now() - startMs
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
}

function getProjectSubtitle(projectPath: string, projectName: string): string {
  if (!projectPath) return ''
  const normalized = projectPath.replace(/\\/g, '/')
  const homeMarkers = ['/Users/', '/users/']
  for (const marker of homeMarkers) {
    const idx = normalized.indexOf(marker)
    if (idx !== -1) {
      const afterHome = normalized.slice(normalized.indexOf('/', idx + marker.length) + 1)
      const withoutProject = afterHome.endsWith('/' + projectName)
        ? afterHome.slice(0, -(projectName.length + 1))
        : afterHome
      return withoutProject ? `~/${withoutProject}` : '~'
    }
  }
  const parts = normalized.split('/').filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 2] : ''
}

export function DetailCard({ session }: DetailCardProps): React.JSX.Element {
  const {
    projectName, projectPath, status, currentAction, currentTask,
    tasks, completedTodos, totalTodos, startedAt, lastActivityAt
  } = session

  const subtitle = getProjectSubtitle(projectPath, projectName)
  const hasProgress = totalTodos > 0
  const progressPct = hasProgress ? Math.round((completedTodos / totalTodos) * 100) : 0
  const toolIcon = currentAction.tool ? (TOOL_ICONS[currentAction.tool] || '🔧') : null

  return (
    <div className={`detail-card detail-card--${status}`}>
      {/* Top row: project name + status */}
      <div className="detail-card-header">
        <div className="detail-card-project">
          <span className="detail-card-name">{projectName}</span>
          {subtitle && <span className="detail-card-path">{subtitle}</span>}
        </div>
        <div className="detail-card-meta">
          <span className={`detail-card-status detail-card-status--${status}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="detail-card-time">{formatRelativeTime(lastActivityAt)}</span>
        </div>
      </div>

      {/* Current action */}
      {currentAction.summary && (
        <div className="detail-card-action">
          {toolIcon && <span className="detail-card-tool-icon">{toolIcon}</span>}
          <span className="detail-card-action-text">{currentAction.summary}</span>
          {currentAction.file && (
            <span className="detail-card-file">{currentAction.file.split(/[/\\]/).pop()}</span>
          )}
        </div>
      )}

      {/* Current task */}
      {currentTask && (
        <div className="detail-card-task">
          <span className="detail-card-task-text">{currentTask}</span>
        </div>
      )}

      {/* Progress bar */}
      {hasProgress && (
        <div className="detail-card-progress">
          <div className="detail-card-progress-track">
            <div
              className="detail-card-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="detail-card-progress-label">
            {completedTodos}/{totalTodos}
          </span>
        </div>
      )}

      {/* Task list (show up to 5) */}
      {tasks.length > 0 && (
        <div className="detail-card-tasks">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className={`detail-card-task-item detail-card-task-item--${task.status}`}>
              <span className="detail-card-task-check">
                {task.status === 'completed' ? '✓' : task.status === 'in_progress' ? '◌' : '○'}
              </span>
              <span className="detail-card-task-label">
                {task.activeForm || task.subject || task.description || 'Task'}
              </span>
            </div>
          ))}
          {tasks.length > 5 && (
            <div className="detail-card-task-more">+{tasks.length - 5} more</div>
          )}
        </div>
      )}

      {/* Footer: time working */}
      {startedAt > 0 && (
        <div className="detail-card-footer">
          <span className="detail-card-duration">
            Working for {formatDuration(startedAt)}
          </span>
        </div>
      )}
    </div>
  )
}
