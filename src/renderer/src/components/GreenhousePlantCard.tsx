import React, { useMemo } from 'react'
import type { SessionInfo, SessionStatus } from '../../../shared/types'
import { getPlantComponent, Pot } from './plants'

interface GreenhousePlantCardProps {
  session: SessionInfo
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; className: string }> = {
  working: { label: 'Working', className: 'greenhouse-badge--working' },
  waiting: { label: 'Waiting', className: 'greenhouse-badge--waiting' },
  idle:    { label: 'Idle',    className: 'greenhouse-badge--idle' },
  done:    { label: 'Done',    className: 'greenhouse-badge--done' },
  error:   { label: 'Error',   className: 'greenhouse-badge--error' },
}

const TOOL_ICONS: Record<string, string> = {
  Read:  '\u{1F4C4}',
  Edit:  '\u270F',
  Write: '\u{1F4DD}',
  Bash:  '\u{1F4BB}',
  Grep:  '\u{1F50D}',
  Glob:  '\u{1F4C2}',
}

function formatDuration(startMs: number): string {
  const diffMs = Date.now() - startMs
  const totalMin = Math.max(1, Math.floor(diffMs / 60000))
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

function getToolIcon(tool: string | null): string {
  if (!tool) return ''
  return TOOL_ICONS[tool] || '\u2699'
}

function truncatePath(filePath: string | null): string {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  if (parts.length <= 3) return normalized
  return '.../' + parts.slice(-2).join('/')
}

export function GreenhousePlantCard({ session }: GreenhousePlantCardProps): React.JSX.Element {
  const {
    plantType,
    status,
    projectName,
    currentAction,
    currentTask,
    completedTodos,
    totalTodos,
    tasks,
    startedAt,
  } = session

  const Plant = useMemo(() => getPlantComponent(plantType), [plantType])

  // Growth = plan progress if tasks exist, otherwise time-based (grows over first 2 hours)
  let growth: number
  if (totalTodos > 0) {
    growth = completedTodos / totalTodos
  } else {
    const ageMin = (Date.now() - startedAt) / 60_000
    growth = Math.min(0.85, 0.15 + (ageMin / 120) * 0.7)
  }
  const hasProgress = totalTodos > 0
  const progressPct = hasProgress ? Math.round((completedTodos / totalTodos) * 100) : 0
  const statusConfig = STATUS_CONFIG[status]
  const duration = formatDuration(startedAt)
  const toolIcon = getToolIcon(currentAction.tool)
  const filePath = truncatePath(currentAction.file)

  return (
    <div className={`greenhouse-card greenhouse-card--${status}`}>
      {/* Plant display */}
      <div className="greenhouse-card-plant">
        <div className="greenhouse-card-plant-svg">
          <Plant state={status} size="lg" growth={growth} />
        </div>
        <Pot size="lg" label={projectName} />
      </div>

      {/* Info section */}
      <div className="greenhouse-card-info">
        <div className="greenhouse-card-header">
          <span className="greenhouse-card-name">{projectName}</span>
          <span className={`greenhouse-badge ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Current action */}
        {(currentAction.tool || currentAction.file) && (
          <div className="greenhouse-card-action">
            {toolIcon && <span className="greenhouse-card-tool-icon">{toolIcon}</span>}
            {filePath && <span className="greenhouse-card-file">{filePath}</span>}
          </div>
        )}

        {/* Current task */}
        {currentTask && (
          <div className="greenhouse-card-task">{currentTask}</div>
        )}

        {/* Progress bar */}
        {hasProgress && (
          <div className="greenhouse-card-progress">
            <div className="greenhouse-card-progress-track">
              <div
                className="greenhouse-card-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="greenhouse-card-progress-label">
              {completedTodos}/{totalTodos}
            </span>
          </div>
        )}

        {/* Task list */}
        {tasks.length > 0 && (
          <ul className="greenhouse-card-tasks">
            {tasks.map((task) => (
              <li key={task.id} className={`greenhouse-card-task-item greenhouse-card-task-item--${task.status}`}>
                <span className="greenhouse-card-task-icon">
                  {task.status === 'completed' && '\u2713'}
                  {task.status === 'in_progress' && '\u25E6'}
                  {task.status === 'pending' && '\u25CB'}
                </span>
                <span className="greenhouse-card-task-text">
                  {task.subject || task.description || task.activeForm || '...'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer: duration */}
        <div className="greenhouse-card-footer">
          <span className="greenhouse-card-duration">{duration}</span>
        </div>
      </div>
    </div>
  )
}
