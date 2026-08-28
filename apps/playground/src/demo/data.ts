export interface DemoAccount {
  readonly [key: string]: unknown
  readonly id: number
  readonly name: string
  readonly email: string
  readonly avatarUrl?: string
  readonly status: 'active' | 'invited' | 'suspended'
  readonly role: string
  readonly team: string
  readonly region: string
  readonly signIns: number
  readonly revenue: number
  readonly createdAt: string
  readonly lastSeenAt: string
  readonly note: string
}

const names = [
  'Maya Chen',
  'Noah Williams',
  'Amara Okafor',
  'Luca Rossi',
  'Sofia Hernández',
  'Aarav Patel',
] as const
const roles = ['Owner', 'Administrator', 'Analyst', 'Editor'] as const
const teams = ['Operations', 'Growth', 'Finance', 'Content'] as const
const regions = ['London', 'Dublin', 'New York', 'Manchester'] as const
const statuses: readonly DemoAccount['status'][] = ['active', 'active', 'invited', 'suspended']

export const demoAccounts: readonly DemoAccount[] = Array.from({ length: 47 }, (_, index) => {
  const id = index + 1
  const name = names[index % names.length] ?? 'Vela User'
  return {
    id,
    name,
    email: `${name.toLocaleLowerCase().replaceAll(' ', '.')}@example.dev`,
    status: statuses[index % statuses.length] ?? 'active',
    role: roles[index % roles.length] ?? 'Analyst',
    team: teams[index % teams.length] ?? 'Operations',
    region: regions[index % regions.length] ?? 'London',
    signIns: 14 + index * 7,
    revenue: 1800 + index * 137.45,
    createdAt: `2026-08-${String((index % 24) + 1).padStart(2, '0')}`,
    lastSeenAt: new Date(Date.UTC(2026, 7, 27 - (index % 6), (index % 12) + 8, 24)).toISOString(),
    note:
      index % 5 === 0
        ? 'This deliberately long value demonstrates bounded ellipsis without forcing every row or column to become oversized.'
        : 'Workspace member',
  }
})
