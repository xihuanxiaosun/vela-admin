export interface OverflowMetrics {
  readonly clientWidth: number
  readonly clientHeight: number
  readonly scrollWidth: number
  readonly scrollHeight: number
}

export function isContentTruncated(metrics: OverflowMetrics, tolerance = 1): boolean {
  return (
    metrics.scrollWidth - metrics.clientWidth > tolerance ||
    metrics.scrollHeight - metrics.clientHeight > tolerance
  )
}
