import type { SemanticIntent } from '@vela-admin/ui'

export interface RowAction {
  readonly key: string
  readonly label: string
  readonly icon?: string
  readonly intent?: SemanticIntent
  readonly disabled?: boolean
  /** Keeps action geometry stable while the host-side command is in flight. */
  readonly loading?: boolean
  readonly hidden?: boolean
  readonly priority?: number
}
