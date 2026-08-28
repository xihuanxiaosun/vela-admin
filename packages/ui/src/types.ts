export type SemanticIntent = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger'
export type ControlAppearance = 'solid' | 'tonal' | 'outline' | 'text' | 'plain'
export type ControlSize = 'small' | 'medium' | 'large'
export type SemanticTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

export interface AvatarItem {
  readonly id: string | number
  readonly name?: string
  readonly image?: string
  readonly icon?: string
}

export interface StatTrend {
  readonly value: string
  readonly label?: string
  readonly direction: 'up' | 'down' | 'flat'
}
