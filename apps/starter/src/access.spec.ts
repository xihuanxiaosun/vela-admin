import { describe, expect, it } from 'vitest'

import { createStarterAccessRuntime } from './access'
import {
  issueStarterAccessToken,
  parseStarterAccessToken,
  starterCapabilities,
  starterRoleCan,
} from './access-policy'

describe('Starter access example', () => {
  it('keeps the documented role matrix explicit and fail-closed', () => {
    expect(starterRoleCan('administrator', starterCapabilities.usersDelete)).toBe(true)
    expect(starterRoleCan('administrator', starterCapabilities.settingsManage)).toBe(true)
    expect(starterRoleCan('editor', starterCapabilities.usersUpdate)).toBe(true)
    expect(starterRoleCan('editor', starterCapabilities.usersDelete)).toBe(false)
    expect(starterRoleCan('viewer', starterCapabilities.usersRead)).toBe(true)
    expect(starterRoleCan('viewer', 'users.export')).toBe(false)
  })

  it('issues only the deliberately scoped demo token format', () => {
    const token = issueStarterAccessToken('editor')
    expect(parseStarterAccessToken(token)).toBe('editor')
    expect(parseStarterAccessToken('vela-starter-role:owner')).toBeUndefined()
    expect(parseStarterAccessToken('production-looking-token')).toBeUndefined()
  })

  it('refreshes identity, token, permissions, and access revision after a role change', async () => {
    const runtime = createStarterAccessRuntime('viewer')
    const initialRevision = runtime.access.revision.value

    await expect(runtime.access.can(starterCapabilities.usersRead)).resolves.toBe(true)
    await expect(runtime.access.can(starterCapabilities.usersCreate)).resolves.toBe(false)

    const snapshot = await runtime.setRole('editor')

    expect(runtime.role.value).toBe('editor')
    expect(snapshot.identity?.role).toBe('editor')
    expect(snapshot.accessToken).toBe(issueStarterAccessToken('editor'))
    expect(runtime.access.revision.value).toBe(initialRevision + 1)
    await expect(runtime.access.can(starterCapabilities.usersCreate)).resolves.toBe(true)
    await expect(runtime.access.can(starterCapabilities.settingsManage)).resolves.toBe(false)
  })
})
