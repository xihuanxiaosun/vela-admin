export type DemoFinanceStatus = 'settled' | 'pending' | 'refunded'

export interface DemoFinanceRecord {
  readonly [key: string]: unknown
  readonly id: number
  readonly reference: string
  readonly service: string
  readonly serviceGroup: string
  readonly customer: string
  readonly channel: 'card' | 'wallet' | 'bank'
  readonly gross: number
  readonly fee: number
  readonly net: number
  readonly change: number
  readonly reconciliation: number
  readonly status: DemoFinanceStatus
  readonly paidAt: string
}

const services = [
  ['Home cleaning', 'Home services'],
  ['Premium listing', 'Marketplace'],
  ['Featured post', 'Content'],
  ['Consultation', 'Professional services'],
] as const
const customers = ['Maya Chen', 'Northstar Labs', 'Harbour Works', 'Atlas Retail'] as const
const channels: readonly DemoFinanceRecord['channel'][] = ['card', 'wallet', 'bank']
const statuses: readonly DemoFinanceStatus[] = ['settled', 'settled', 'pending', 'refunded']

export const demoFinanceRecords: readonly DemoFinanceRecord[] = Array.from(
  { length: 84 },
  (_, index) => {
    const id = index + 1
    const service = services[index % services.length] ?? services[0]
    const status = statuses[index % statuses.length] ?? 'settled'
    const gross = status === 'refunded' ? -(68 + index * 1.75) : 68 + index * 6.35
    const fee = status === 'refunded' ? 0 : Math.round(Math.abs(gross) * 0.029 * 100) / 100
    return {
      id,
      reference: `TX-${String(2608000 + id)}`,
      service: service[0],
      serviceGroup: service[1],
      customer: customers[index % customers.length] ?? 'Vela customer',
      channel: channels[index % channels.length] ?? 'card',
      gross,
      fee,
      net: gross - fee,
      change: ((index % 9) - 4) * 1.4,
      reconciliation: status === 'pending' ? 38 + (index % 4) * 12 : 100,
      status,
      paidAt: new Date(Date.UTC(2026, 7, 27 - (index % 12), 8 + (index % 10), 15)).toISOString(),
    }
  },
)
