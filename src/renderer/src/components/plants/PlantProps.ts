import type { SessionStatus } from '../../../../shared/types'

export interface PlantProps {
  state: SessionStatus   // 'working' | 'waiting' | 'idle' | 'done' | 'error'
  size?: 'sm' | 'md' | 'lg'  // sm=garden widget, md=default, lg=greenhouse
  growth?: number        // 0-1, maps to task progress (affects plant fullness)
}
