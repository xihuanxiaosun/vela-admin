export const starterAccessRoles = ['administrator', 'editor', 'viewer'] as const
export type StarterAccessRole = (typeof starterAccessRoles)[number]

export const starterCapabilities = Object.freeze({
  usersRead: 'users.read',
  usersCreate: 'users.create',
  usersUpdate: 'users.update',
  usersDelete: 'users.delete',
  settingsManage: 'settings.manage',
} as const)

export type StarterCapability = (typeof starterCapabilities)[keyof typeof starterCapabilities]

const capabilitiesByRole: Readonly<Record<StarterAccessRole, readonly StarterCapability[]>> = {
  administrator: Object.values(starterCapabilities),
  editor: [
    starterCapabilities.usersRead,
    starterCapabilities.usersCreate,
    starterCapabilities.usersUpdate,
  ],
  viewer: [starterCapabilities.usersRead],
}

const demoTokenPrefix = 'vela-starter-role:'

export function isStarterAccessRole(value: unknown): value is StarterAccessRole {
  return typeof value === 'string' && starterAccessRoles.some((candidate) => candidate === value)
}

export function starterRoleCan(role: StarterAccessRole, capability: string): boolean {
  return capabilitiesByRole[role].some((candidate) => candidate === capability)
}

/** Demo-only token format. A production host must validate tokens on its trusted backend. */
export function issueStarterAccessToken(role: StarterAccessRole): string {
  return `${demoTokenPrefix}${role}`
}

export function parseStarterAccessToken(token: string): StarterAccessRole | undefined {
  if (!token.startsWith(demoTokenPrefix)) return undefined
  const role = token.slice(demoTokenPrefix.length)
  return isStarterAccessRole(role) ? role : undefined
}
