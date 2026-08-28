import { describe, expect, it, vi } from 'vitest'

import {
  createDeferred,
  createMemoryStorage,
  createPermissionFake,
  createTransportFake,
  createUploadFake,
} from './index'

describe('test fakes', () => {
  it('provides deterministic storage and permissions', async () => {
    const storage = createMemoryStorage({ density: 'compact' })
    expect(await storage.get('density')).toBe('compact')
    await storage.set('theme', 'dark')
    expect(storage.snapshot()).toEqual({ density: 'compact', theme: 'dark' })
    await storage.remove('density')
    expect(await storage.get('missing')).toBeUndefined()
    expect(storage.snapshot()).toEqual({ theme: 'dark' })

    const permission = createPermissionFake(['users.read', 'users.write'])
    expect(await permission.can('users.read')).toBe(true)
    expect(await permission.can('users.delete')).toBe(false)
    expect(await permission.canAny?.(['users.delete', 'users.write'])).toBe(true)
    expect(await permission.canAll?.(['users.read', 'users.write'])).toBe(true)
    expect(await permission.canAll?.(['users.read', 'users.delete'])).toBe(false)
  })

  it('creates controllable deferred promises', async () => {
    const deferred = createDeferred<number>()
    deferred.resolve(7)
    expect(await deferred.promise).toBe(7)
  })

  it('records transport requests and returns typed handler responses', async () => {
    const transport = createTransportFake((request) => ({
      status: 200,
      headers: { 'x-path': request.url },
      data: { ok: true },
    }))

    await expect(transport.request<{ ok: boolean }>({ url: '/health' })).resolves.toMatchObject({
      data: { ok: true },
    })
    expect(transport.requests).toEqual([{ url: '/health' }])
  })

  it('records uploads and emits deterministic completion progress', async () => {
    const upload = createUploadFake((file) => `/files/${file.name}`)
    const onProgress = vi.fn()
    const result = await upload.upload({
      file: { name: 'guide.pdf', size: 2048, type: 'application/pdf' },
      signal: new AbortController().signal,
      onProgress,
    })

    expect(result).toEqual({ value: '/files/guide.pdf' })
    expect(upload.requests).toHaveLength(1)
    expect(onProgress).toHaveBeenCalledWith({ loaded: 2048, total: 2048, percentage: 100 })
  })
})
