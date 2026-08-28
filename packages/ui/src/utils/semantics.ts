import type { ControlAppearance, SemanticIntent, SemanticTone } from '../types'

export function colorForIntent(intent: SemanticIntent): string | undefined {
  switch (intent) {
    case 'primary':
      return 'primary'
    case 'secondary':
      return 'secondary'
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'danger':
      return 'error'
    case 'neutral':
      return undefined
  }
}

export function variantForAppearance(
  appearance: ControlAppearance,
): 'flat' | 'tonal' | 'outlined' | 'text' | 'plain' {
  switch (appearance) {
    case 'solid':
      return 'flat'
    case 'outline':
      return 'outlined'
    case 'tonal':
    case 'text':
    case 'plain':
      return appearance
  }
}

export function colorForTone(tone: SemanticTone): string | undefined {
  switch (tone) {
    case 'neutral':
      return undefined
    case 'primary':
      return 'primary'
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'danger':
      return 'error'
    case 'info':
      return 'info'
  }
}

export function avatarInitial(name?: string): string | undefined {
  const normalized = name?.trim()
  if (!normalized) return undefined
  return Array.from(normalized)[0]?.toLocaleUpperCase()
}
