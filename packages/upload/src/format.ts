export function formatFileSize(bytes: number, locale?: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = bytes / 1024
  let unit: (typeof units)[number] = units[0]
  for (const candidate of units.slice(1)) {
    if (value < 1024) break
    value /= 1024
    unit = candidate
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`
}
