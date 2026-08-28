import type { SemanticTone } from '@vela-admin/ui'

import type {
  BooleanColumnPresentation,
  CurrencyColumnPresentation,
  IdentityCellValue,
  MediaCellValue,
  NumberColumnPresentation,
  ProgressCellValue,
  ProgressColumnPresentation,
  StatusColumnPresentation,
  TemporalColumnPresentation,
  TrendCellValue,
  TrendColumnPresentation,
} from './types'

export interface ResolvedIdentityPresentation {
  readonly primary: string
  readonly secondary?: string
  readonly image?: string
  readonly icon?: string
}

export interface ResolvedStatusPresentation {
  readonly label: string
  readonly tone: SemanticTone
  readonly icon?: string
}

export interface ResolvedMediaPresentation {
  readonly primary: string
  readonly secondary?: string
  readonly image?: string
  readonly alt: string
  readonly icon?: string
}

export interface ResolvedCurrencyPresentation {
  readonly formatted: string
  readonly parts: readonly Intl.NumberFormatPart[]
  readonly numeric?: number
}

export interface ResolvedBooleanPresentation {
  readonly state: 'true' | 'false' | 'unknown'
  readonly label?: string
  readonly tone: SemanticTone
  readonly icon?: string
}

export interface ResolvedProgressPresentation {
  readonly value: number
  readonly max: number
  readonly ratio: number
  readonly percentage: number
  readonly label?: string
  readonly secondary?: string
  readonly tone?: SemanticTone
}

export interface ResolvedTrendPresentation {
  readonly value: string
  readonly delta?: string
  readonly secondary?: string
  readonly direction: 'up' | 'down' | 'flat'
  readonly tone: SemanticTone
}

export function displayTableValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '—' : value.toISOString()
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return `${value}`
  }
  if (typeof value === 'symbol') return value.description ?? '—'
  return '—'
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function localeValue(locale?: string | readonly string[]): string | string[] | undefined {
  if (locale === undefined || typeof locale === 'string') return locale
  return [...locale]
}

export function resolveIdentityTableValue(value: unknown): ResolvedIdentityPresentation {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    return { primary: displayTableValue(value) }
  }

  const identity = value as IdentityCellValue
  const secondary = displayTableValue(identity.secondary)
  return {
    primary: displayTableValue(identity.primary),
    ...(secondary === '—' ? {} : { secondary }),
    ...(typeof identity.image === 'string' && identity.image.trim()
      ? { image: identity.image }
      : {}),
    ...(typeof identity.icon === 'string' && identity.icon.trim() ? { icon: identity.icon } : {}),
  }
}

export function resolveMediaTableValue(value: unknown): ResolvedMediaPresentation {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    const primary = displayTableValue(value)
    return { primary, alt: primary }
  }

  const media = value as MediaCellValue
  const primary = displayTableValue(media.primary)
  const secondary = displayTableValue(media.secondary)
  return {
    primary,
    alt: typeof media.alt === 'string' && media.alt.trim() ? media.alt : primary,
    ...(secondary === '—' ? {} : { secondary }),
    ...(typeof media.image === 'string' && media.image.trim() ? { image: media.image } : {}),
    ...(typeof media.icon === 'string' && media.icon.trim() ? { icon: media.icon } : {}),
  }
}

export function formatNumberTableValue(
  value: unknown,
  presentation: NumberColumnPresentation,
): string {
  const amount = numericValue(value)
  if (amount === undefined) return displayTableValue(value)
  try {
    const formatted = new Intl.NumberFormat(localeValue(presentation.locale), {
      notation: presentation.notation ?? 'standard',
      ...(presentation.minimumFractionDigits === undefined
        ? {}
        : { minimumFractionDigits: presentation.minimumFractionDigits }),
      ...(presentation.maximumFractionDigits === undefined
        ? {}
        : { maximumFractionDigits: presentation.maximumFractionDigits }),
    }).format(amount)
    return `${presentation.prefix ?? ''}${formatted}${presentation.suffix ? `\u00a0${presentation.suffix}` : ''}`
  } catch {
    return displayTableValue(value)
  }
}

export function formatCurrencyTableValue(
  value: unknown,
  presentation: CurrencyColumnPresentation,
): string {
  return resolveCurrencyTableValue(value, presentation).formatted
}

export function resolveCurrencyTableValue(
  value: unknown,
  presentation: CurrencyColumnPresentation,
): ResolvedCurrencyPresentation {
  const amount = numericValue(value)
  if (amount === undefined) {
    const formatted = displayTableValue(value)
    return { formatted, parts: [{ type: 'literal', value: formatted }] }
  }
  try {
    const formatter = new Intl.NumberFormat(localeValue(presentation.locale), {
      style: 'currency',
      currency: presentation.currency,
      currencyDisplay: presentation.currencyDisplay ?? 'narrowSymbol',
      notation: presentation.notation ?? 'standard',
      ...(presentation.minimumFractionDigits === undefined
        ? {}
        : { minimumFractionDigits: presentation.minimumFractionDigits }),
      ...(presentation.maximumFractionDigits === undefined
        ? {}
        : { maximumFractionDigits: presentation.maximumFractionDigits }),
      ...(presentation.showSign ? { signDisplay: 'exceptZero' as const } : {}),
    })
    return {
      formatted: formatter.format(amount),
      parts: formatter.formatToParts(amount),
      numeric: amount,
    }
  } catch {
    const formatted = displayTableValue(value)
    return { formatted, parts: [{ type: 'literal', value: formatted }] }
  }
}

function dateValue(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function formatTemporalTableValue(
  value: unknown,
  presentation: TemporalColumnPresentation,
): string {
  const parsed = dateValue(value)
  if (!parsed) return displayTableValue(value)
  try {
    return new Intl.DateTimeFormat(localeValue(presentation.locale), {
      dateStyle: presentation.dateStyle ?? 'medium',
      ...(presentation.kind === 'datetime' ? { timeStyle: presentation.timeStyle ?? 'short' } : {}),
      ...(presentation.timeZone ? { timeZone: presentation.timeZone } : {}),
    }).format(parsed)
  } catch {
    return displayTableValue(value)
  }
}

export function formatRelativeTemporalValue(
  value: unknown,
  presentation: TemporalColumnPresentation,
): string | undefined {
  if (!presentation.relative) return undefined
  const parsed = dateValue(value)
  const reference = dateValue(presentation.relativeTo ?? Date.now())
  if (!parsed || !reference) return undefined

  const seconds = (parsed.getTime() - reference.getTime()) / 1_000
  const ranges = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3_600, divisor: 60, unit: 'minute' },
    { limit: 86_400, divisor: 3_600, unit: 'hour' },
    { limit: 2_592_000, divisor: 86_400, unit: 'day' },
    { limit: 31_536_000, divisor: 2_592_000, unit: 'month' },
    { limit: Number.POSITIVE_INFINITY, divisor: 31_536_000, unit: 'year' },
  ] as const
  const absoluteSeconds = Math.abs(seconds)
  const range = ranges.find((candidate) => absoluteSeconds < candidate.limit) ?? ranges.at(-1)
  if (!range) return undefined
  try {
    return new Intl.RelativeTimeFormat(localeValue(presentation.locale), {
      numeric: 'auto',
    }).format(Math.round(seconds / range.divisor), range.unit)
  } catch {
    return undefined
  }
}

export function resolveStatusTableValue(
  value: unknown,
  presentation: StatusColumnPresentation,
): ResolvedStatusPresentation {
  const key = displayTableValue(value)
  const configured = presentation.values?.[key] ?? presentation.fallback
  return {
    label: configured?.label ?? key,
    tone: configured?.tone ?? 'neutral',
    ...(configured?.icon === undefined ? {} : { icon: configured.icon }),
  }
}

function includesValue(values: readonly unknown[], value: unknown): boolean {
  return values.some((candidate) => Object.is(candidate, value))
}

export function resolveBooleanTableValue(
  value: unknown,
  presentation: BooleanColumnPresentation,
): ResolvedBooleanPresentation {
  const truthy = presentation.trueValues ?? [true]
  const falsy = presentation.falseValues ?? [false]
  const state = includesValue(truthy, value)
    ? 'true'
    : includesValue(falsy, value)
      ? 'false'
      : 'unknown'
  const configured =
    state === 'true'
      ? presentation.trueState
      : state === 'false'
        ? presentation.falseState
        : presentation.fallback
  return {
    state,
    tone: configured?.tone ?? (state === 'true' ? 'success' : 'neutral'),
    ...(configured?.label === undefined ? {} : { label: configured.label }),
    ...(configured?.icon === undefined ? {} : { icon: configured.icon }),
  }
}

function progressCellValue(value: unknown): ProgressCellValue | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return { value }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    return undefined
  }
  const candidate = value as Partial<ProgressCellValue>
  if (typeof candidate.value !== 'number' || !Number.isFinite(candidate.value)) return undefined
  return candidate as ProgressCellValue
}

export function resolveProgressTableValue(
  value: unknown,
  presentation: ProgressColumnPresentation,
): ResolvedProgressPresentation | undefined {
  const progress = progressCellValue(value)
  if (!progress) return undefined
  const minimum = Number.isFinite(presentation.min) ? (presentation.min ?? 0) : 0
  const maximumCandidate = progress.max ?? presentation.max ?? 100
  const maximum =
    Number.isFinite(maximumCandidate) && maximumCandidate > minimum
      ? maximumCandidate
      : minimum + 100
  const bounded = Math.min(maximum, Math.max(minimum, progress.value))
  const ratio = (bounded - minimum) / (maximum - minimum)
  const percentage = ratio * 100
  const explicitLabel = displayTableValue(progress.label)
  const secondary = displayTableValue(progress.secondary)
  let generatedLabel: string | undefined
  if (presentation.showValue ?? true) {
    generatedLabel = `${new Intl.NumberFormat(localeValue(presentation.locale), {
      maximumFractionDigits: presentation.maximumFractionDigits ?? 0,
    }).format(percentage)}%`
  }
  return {
    value: progress.value,
    max: maximum,
    ratio,
    percentage,
    ...(explicitLabel === '—'
      ? generatedLabel
        ? { label: generatedLabel }
        : {}
      : { label: explicitLabel }),
    ...(secondary === '—' ? {} : { secondary }),
    ...(progress.tone === undefined ? {} : { tone: progress.tone }),
  }
}

function trendCellValue(value: unknown): TrendCellValue | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return { value }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    return undefined
  }
  const candidate = value as Partial<TrendCellValue>
  if (typeof candidate.value !== 'number' || !Number.isFinite(candidate.value)) return undefined
  return candidate as TrendCellValue
}

export function resolveTrendTableValue(
  value: unknown,
  presentation: TrendColumnPresentation,
): ResolvedTrendPresentation | undefined {
  const trend = trendCellValue(value)
  if (!trend) return undefined
  const numberOptions: NumberColumnPresentation = {
    kind: 'number',
    ...(presentation.locale === undefined ? {} : { locale: presentation.locale }),
    ...(presentation.notation === undefined ? {} : { notation: presentation.notation }),
    ...(presentation.minimumFractionDigits === undefined
      ? {}
      : { minimumFractionDigits: presentation.minimumFractionDigits }),
    ...(presentation.maximumFractionDigits === undefined
      ? {}
      : { maximumFractionDigits: presentation.maximumFractionDigits }),
    ...(presentation.prefix === undefined ? {} : { prefix: presentation.prefix }),
    ...(presentation.suffix === undefined ? {} : { suffix: presentation.suffix }),
  }
  const delta =
    typeof trend.delta === 'number' && Number.isFinite(trend.delta) ? trend.delta : undefined
  const direction = delta === undefined || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
  const positiveIsGood = presentation.higherIsBetter ?? true
  const tone: SemanticTone =
    direction === 'flat'
      ? 'neutral'
      : (direction === 'up') === positiveIsGood
        ? 'success'
        : 'danger'
  let formattedDelta: string | undefined
  if (delta !== undefined) {
    try {
      formattedDelta = new Intl.NumberFormat(localeValue(presentation.locale), {
        signDisplay: 'exceptZero',
        minimumFractionDigits: presentation.minimumFractionDigits,
        maximumFractionDigits: presentation.maximumFractionDigits ?? 1,
      }).format(delta)
      if ((presentation.deltaStyle ?? 'percent') === 'percent') formattedDelta += '%'
    } catch {
      formattedDelta = `${delta}`
    }
  }
  const secondary = displayTableValue(trend.secondary)
  const formattedValue = presentation.currency
    ? resolveCurrencyTableValue(trend.value, {
        kind: 'currency',
        currency: presentation.currency,
        ...(presentation.locale === undefined ? {} : { locale: presentation.locale }),
        ...(presentation.notation === undefined ? {} : { notation: presentation.notation }),
        ...(presentation.currencyDisplay === undefined
          ? {}
          : { currencyDisplay: presentation.currencyDisplay }),
        ...(presentation.minimumFractionDigits === undefined
          ? {}
          : { minimumFractionDigits: presentation.minimumFractionDigits }),
        ...(presentation.maximumFractionDigits === undefined
          ? {}
          : { maximumFractionDigits: presentation.maximumFractionDigits }),
      }).formatted
    : formatNumberTableValue(trend.value, numberOptions)
  return {
    value: formattedValue,
    direction,
    tone,
    ...(formattedDelta === undefined ? {} : { delta: formattedDelta }),
    ...(secondary === '—' ? {} : { secondary }),
  }
}
