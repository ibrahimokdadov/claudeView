import React from 'react'

interface GardenHeaderProps {
  count: number
  onExpand: () => void
  onRefresh: () => void
  onClose: () => void
}

export function GardenHeader({ count, onExpand, onRefresh, onClose }: GardenHeaderProps): React.JSX.Element {
  return (
    <div className="garden-header">
      <div className="garden-header-drag">
        <svg className="garden-header-leaf" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 12C2 12 3 4 10 2C10 2 11 9 5 11C5 11 8 8 9 5"
            stroke="var(--plant-green)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="garden-header-title">Claude Garden</span>
        {count > 0 && <span className="garden-header-badge">{count}</span>}
      </div>
      <div className="garden-header-actions">
        <button className="btn-icon" onClick={onExpand} title="Open Greenhouse">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button className="btn-icon" onClick={onRefresh} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M11.5 7A4.5 4.5 0 1 1 9 3.5M11.5 2v3h-3"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="btn-icon btn-close" onClick={onClose} title="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
