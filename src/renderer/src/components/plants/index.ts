import React from 'react'
import type { PlantType } from '../../../../shared/types'
import type { PlantProps } from './PlantProps'
import Succulent from './Succulent'
import Fern from './Fern'
import Flower from './Flower'
import SmallTree from './SmallTree'
import Cactus from './Cactus'
import Pot from './Pot'

const plantMap: Record<PlantType, React.FC<PlantProps>> = {
  succulent: Succulent,
  fern: Fern,
  flower: Flower,
  smallTree: SmallTree,
  cactus: Cactus,
}

export function getPlantComponent(type: PlantType): React.FC<PlantProps> {
  return plantMap[type] ?? Succulent
}

export { Succulent, Fern, Flower, SmallTree, Cactus, Pot }
export type { PlantProps } from './PlantProps'
