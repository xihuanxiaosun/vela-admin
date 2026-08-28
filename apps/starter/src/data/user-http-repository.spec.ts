import { createAuthenticatedTransport, TransportFailure } from '@vela-admin/adapters'
import { describe, expect, it } from 'vitest'

import { createStarterAccessRuntime } from '../access'
import { issueStarterAccessToken, type StarterAccessRole } from '../access-policy'
import { createDemoUserApiTransport, type DemoUserApiOptions } from './demo-user-api'
import { createHttpStarterUserRepository, starterUsersApiPath } from './user-http-repository'
import type { StarterUserInput } from './users'

const exampleInput: StarterUserInput = {
  name: 'Elena Price',
  email: 'elena.price@example.dev',
  role: 'editor',
  team: 'content',
  status: 'active',
}

function createRepository(role: StarterAccessRole, options: DemoUserApiOptions = {}) {
  const runtime = createStarterAccessRuntime(role)
  const api = createDemoUserApiTransport({ latencyMs: 0, ...options })
  const transport = createAuthenticatedTransport(api, runtime.auth, {
    retryUnauthorized: false,
  })
  return {
    api,
    repository: createHttpStarterUserRepository(transport),
    runtime,
  }
}

describe('Starter HTTP user repository', () => {
  it('serializes filters and page pagination through the transport boundary', async () => {
    const { repository } = createRepository('viewer')
    const result = await repository.list(
      {
        filters: { keyword: 'Maya' },
        pagination: { mode: 'page', page: 2, pageSize: 2 },
      },
      new AbortController().signal,
    )

    expect(result.pagination).toEqual({
      mode: 'page',
      page: 2,
      pageSize: 2,
      total: 4,
      pageCount: 2,
    })
    expect(result.items.map((user) => user.id)).toEqual([13, 19])
  })

  it('supports authenticated create, read, update, and delete operations', async () => {
    const { repository } = createRepository('administrator', {
      now: () => new Date('2026-08-28T10:00:00.000Z'),
    })
    const signal = new AbortController().signal

    const created = await repository.create(exampleInput, signal)
    expect(created).toMatchObject({
      id: 25,
      ...exampleInput,
      signIns: 0,
      lastActiveAt: '2026-08-28T10:00:00.000Z',
    })
    await expect(repository.get(created.id, signal)).resolves.toEqual(created)

    const updated = await repository.update(
      created.id,
      { ...exampleInput, name: 'Elena Price Updated' },
      signal,
    )
    expect(updated.name).toBe('Elena Price Updated')

    await repository.remove(created.id, signal)
    await expect(repository.get(created.id, signal)).rejects.toMatchObject({
      normalized: { kind: 'not-found', status: 404 },
    })
  })

  it('enforces permissions in the API simulator as well as in the UI', async () => {
    const viewer = createRepository('viewer').repository
    const editor = createRepository('editor').repository
    const signal = new AbortController().signal

    await expect(
      viewer.list({ filters: {}, pagination: { mode: 'page', page: 1, pageSize: 8 } }, signal),
    ).resolves.toMatchObject({ pagination: { total: 24 } })
    await expect(viewer.create(exampleInput, signal)).rejects.toMatchObject({
      normalized: { kind: 'forbidden', status: 403 },
    })

    const created = await editor.create(exampleInput, signal)
    await expect(editor.remove(created.id, signal)).rejects.toMatchObject({
      normalized: { kind: 'forbidden', status: 403 },
    })
  })

  it('rejects missing bearer authentication before reading data', async () => {
    const api = createDemoUserApiTransport({ latencyMs: 0 })

    await expect(api.request({ url: starterUsersApiPath })).rejects.toMatchObject({
      normalized: { kind: 'unauthorized', status: 401 },
    })
  })

  it('normalizes conflicts and cancellation at the adapter edge', async () => {
    const { repository } = createRepository('administrator')
    const signal = new AbortController().signal

    await expect(
      repository.create({ ...exampleInput, email: 'maya.chen+1@example.dev' }, signal),
    ).rejects.toMatchObject({ normalized: { kind: 'conflict', status: 409 } })

    const controller = new AbortController()
    controller.abort()
    const request = repository.list(
      { filters: {}, pagination: { mode: 'page', page: 1, pageSize: 8 } },
      controller.signal,
    )
    await expect(request).rejects.toBeInstanceOf(TransportFailure)
    await expect(request).rejects.toMatchObject({ normalized: { kind: 'cancelled' } })
  })

  it('fails closed for malformed authentication, pagination, payloads, and endpoints', async () => {
    const api = createDemoUserApiTransport({ latencyMs: 0 })
    const adminHeaders = {
      Authorization: `Bearer ${issueStarterAccessToken('administrator')}`,
    }

    await expect(
      api.request({ url: starterUsersApiPath, headers: { Authorization: 'Basic demo' } }),
    ).rejects.toMatchObject({ normalized: { kind: 'unauthorized', status: 401 } })
    await expect(
      api.request({ url: starterUsersApiPath, headers: { Authorization: 'Bearer invalid' } }),
    ).rejects.toMatchObject({ normalized: { kind: 'unauthorized', status: 401 } })
    await expect(
      api.request({
        url: starterUsersApiPath,
        headers: adminHeaders,
        query: { page: '0' },
      }),
    ).rejects.toMatchObject({ normalized: { kind: 'validation', status: 400 } })
    await expect(
      api.request({
        url: starterUsersApiPath,
        method: 'POST',
        headers: adminHeaders,
        body: null,
      }),
    ).rejects.toMatchObject({ normalized: { kind: 'validation', status: 400 } })
    await expect(
      api.request({
        url: starterUsersApiPath,
        method: 'POST',
        headers: adminHeaders,
        body: { ...exampleInput, email: 'not-an-email' },
      }),
    ).rejects.toMatchObject({ normalized: { kind: 'validation', status: 400 } })
    await expect(api.request({ url: '/api/unknown' })).rejects.toMatchObject({
      normalized: { kind: 'not-found', status: 404 },
    })
  })
})
