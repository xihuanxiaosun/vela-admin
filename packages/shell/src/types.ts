export interface NavigationBadge {
  readonly content: string | number
  readonly color?: string
}

export type NavigationItemKind = 'link' | 'group' | 'section'
export type ShellPageMode = 'document' | 'workspace'

export interface NavigationItem {
  readonly id: string
  readonly label: string
  readonly kind?: NavigationItemKind
  readonly icon?: string
  readonly href?: string
  readonly capability?: string
  readonly badge?: NavigationBadge
  readonly keywords?: readonly string[]
  readonly children?: readonly NavigationItem[]
  readonly disabled?: boolean
  /** Chooses between a scrolling document and a viewport-bound operational workspace. */
  readonly pageMode?: ShellPageMode
}

export interface WorkspaceTab {
  readonly id: string
  readonly label: string
  readonly icon?: string
  readonly href?: string
  readonly closable?: boolean
  readonly pinned?: boolean
  readonly dirty?: boolean
}

export interface ShellUser {
  readonly id: string | number
  readonly name: string
  readonly subtitle?: string
  readonly avatar?: string
}

export type ShellLayout = 'sidebar' | 'compact' | 'topbar'
export type ShellContentWidth = 'boxed' | 'fluid'
export type ShellHeaderStyle = 'floating' | 'attached'
export type ShellContentSpacing = 'compact' | 'comfortable' | 'spacious'

export interface ShellPreferences {
  readonly layout: ShellLayout
  readonly contentWidth: ShellContentWidth
  readonly headerStyle: ShellHeaderStyle
  readonly contentSpacing: ShellContentSpacing
}
