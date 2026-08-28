import type {
  DataPage,
  PagePagination,
  PagePaginationMeta,
  QueryFilters,
} from '@vela-admin/contracts'

export const starterUserStatuses = ['active', 'invited', 'suspended'] as const
export type StarterUserStatus = (typeof starterUserStatuses)[number]

export const starterUserRoles = ['owner', 'administrator', 'analyst', 'editor'] as const
export type StarterUserRole = (typeof starterUserRoles)[number]

export const starterUserTeams = ['operations', 'growth', 'finance', 'content'] as const
export type StarterUserTeam = (typeof starterUserTeams)[number]

export interface StarterUserRecord {
  readonly [key: string]: unknown
  readonly id: number
  readonly name: string
  readonly email: string
  readonly role: StarterUserRole
  readonly team: StarterUserTeam
  readonly status: StarterUserStatus
  readonly signIns: number
  readonly lastActiveAt: string
}

export interface StarterUserInput {
  readonly name: string
  readonly email: string
  readonly role: StarterUserRole
  readonly team: StarterUserTeam
  readonly status: StarterUserStatus
}

export interface StarterUserFilters extends QueryFilters {
  readonly keyword?: string
  readonly role?: StarterUserRole
  readonly status?: StarterUserStatus
  readonly team?: StarterUserTeam
}

export interface StarterUserListQuery {
  readonly filters: StarterUserFilters
  readonly pagination: PagePagination
}

export interface StarterUserRepository {
  readonly list: (
    query: StarterUserListQuery,
    signal: AbortSignal,
  ) => Promise<DataPage<StarterUserRecord, PagePaginationMeta>>
  readonly get: (id: number, signal: AbortSignal) => Promise<StarterUserRecord>
  readonly create: (input: StarterUserInput, signal: AbortSignal) => Promise<StarterUserRecord>
  readonly update: (
    id: number,
    input: StarterUserInput,
    signal: AbortSignal,
  ) => Promise<StarterUserRecord>
  readonly remove: (id: number, signal: AbortSignal) => Promise<void>
}

const seedNames = [
  'Maya Chen',
  'Noah Williams',
  'Amara Okafor',
  'Luca Rossi',
  'Sofia Hernández',
  'Aarav Patel',
] as const

const seedRoles: readonly StarterUserRole[] = ['owner', 'administrator', 'analyst', 'editor']
const seedTeams: readonly StarterUserTeam[] = ['operations', 'growth', 'finance', 'content']
const seedStatuses: readonly StarterUserStatus[] = ['active', 'active', 'invited', 'suspended']

export const starterUserSeed: readonly StarterUserRecord[] = Array.from(
  { length: 24 },
  (_, index) => {
    const name = seedNames[index % seedNames.length] ?? 'Vela User'
    return {
      id: index + 1,
      name,
      email: `${name.toLocaleLowerCase().replaceAll(' ', '.')}+${index + 1}@example.dev`,
      role: seedRoles[index % seedRoles.length] ?? 'analyst',
      team: seedTeams[index % seedTeams.length] ?? 'operations',
      status: seedStatuses[index % seedStatuses.length] ?? 'active',
      signIns: 18 + index * 5,
      lastActiveAt: new Date(
        Date.UTC(2026, 7, 27 - (index % 7), (index % 10) + 8, 24),
      ).toISOString(),
    }
  },
)
