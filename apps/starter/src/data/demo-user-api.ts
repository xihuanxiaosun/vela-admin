import { TransportFailure } from '@vela-admin/adapters'
import type {
  ErrorKind,
  TransportAdapter,
  TransportRequest,
  TransportResponse,
} from '@vela-admin/contracts'

import {
  parseStarterAccessToken,
  starterCapabilities,
  starterRoleCan,
  type StarterCapability,
} from '../access-policy'
import {
  starterUsersApiPath,
  type StarterApiEnvelope,
  type StarterUserPagePayload,
} from './user-http-repository'
import {
  starterUserRoles,
  starterUserSeed,
  starterUserStatuses,
  starterUserTeams,
  type StarterUserInput,
  type StarterUserRecord,
} from './users'

export interface DemoUserApiOptions {
  readonly initialRecords?: readonly StarterUserRecord[]
  readonly latencyMs?: number
  readonly now?: () => Date
}

function failure(
  kind: ErrorKind,
  message: string,
  status: number | undefined,
  retryable = false,
): TransportFailure {
  return new TransportFailure({
    kind,
    message,
    retryable,
    ...(status === undefined ? {} : { status }),
  })
}

function cancelledFailure(): TransportFailure {
  return failure('cancelled', 'The request was cancelled.', undefined)
}

function wait(signal: AbortSignal | undefined, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledFailure())
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, duration)
    const onAbort = () => {
      clearTimeout(timer)
      reject(cancelledFailure())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function header(request: TransportRequest, name: string): string | undefined {
  const entry = Object.entries(request.headers ?? {}).find(
    ([key]) => key.toLocaleLowerCase() === name.toLocaleLowerCase(),
  )
  return entry?.[1]
}

function authorize(request: TransportRequest, capability: StarterCapability): void {
  const authorization = header(request, 'authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw failure('unauthorized', 'A valid Bearer token is required.', 401)
  }

  const role = parseStarterAccessToken(authorization.slice('Bearer '.length))
  if (!role) throw failure('unauthorized', 'The access token is invalid.', 401)
  if (!starterRoleCan(role, capability)) {
    throw failure('forbidden', `The current role does not grant ${capability}.`, 403)
  }
}

function response<TData>(data: TData, status = 200): TransportResponse<TData> {
  return {
    data,
    status,
    headers: { 'content-type': 'application/json' },
  }
}

function envelope<TData>(data: TData): StarterApiEnvelope<TData> {
  return { data }
}

function copyRecord(record: StarterUserRecord): StarterUserRecord {
  return { ...record }
}

function queryValue(request: TransportRequest, key: string): string | undefined {
  const value = request.query?.[key]
  return typeof value === 'string' ? value : value?.[0]
}

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw failure('validation', `${label} must be a positive integer.`, 400)
  }
  return parsed
}

function matchesEnum<TValue extends string>(
  values: readonly TValue[],
  value: unknown,
): value is TValue {
  return typeof value === 'string' && values.some((candidate) => candidate === value)
}

function validateInput(value: unknown): StarterUserInput {
  if (typeof value !== 'object' || value === null) {
    throw failure('validation', 'A user payload is required.', 400)
  }

  const input = value as Partial<StarterUserInput>
  if (
    typeof input.name !== 'string' ||
    input.name.trim() === '' ||
    typeof input.email !== 'string' ||
    !input.email.includes('@') ||
    !matchesEnum(starterUserRoles, input.role) ||
    !matchesEnum(starterUserTeams, input.team) ||
    !matchesEnum(starterUserStatuses, input.status)
  ) {
    throw failure('validation', 'The user payload is invalid.', 400)
  }

  return {
    name: input.name.trim(),
    email: input.email.trim().toLocaleLowerCase(),
    role: input.role,
    team: input.team,
    status: input.status,
  }
}

function userId(url: string): number | undefined {
  const match = new RegExp(`^${starterUsersApiPath}/(\\d+)$`).exec(url)
  return match?.[1] === undefined ? undefined : Number(match[1])
}

/**
 * An in-browser API simulator that speaks the same transport contract as a real server.
 * It keeps the Starter runnable while still enforcing authentication and permissions server-side.
 */
export function createDemoUserApiTransport(options: DemoUserApiOptions = {}): TransportAdapter {
  let records = (options.initialRecords ?? starterUserSeed).map(copyRecord)
  const latencyMs = Math.max(0, options.latencyMs ?? 180)
  const now = options.now ?? (() => new Date())

  function findUser(id: number): StarterUserRecord {
    const record = records.find((candidate) => candidate.id === id)
    if (!record) throw failure('not-found', 'The user record was not found.', 404)
    return record
  }

  function assertUniqueEmail(email: string, exceptId?: number): void {
    const duplicate = records.some(
      (record) => record.id !== exceptId && record.email.toLocaleLowerCase() === email,
    )
    if (duplicate) throw failure('conflict', 'A user with this email already exists.', 409)
  }

  return {
    async request<TData, TBody>(request: TransportRequest<TBody>) {
      await wait(request.signal, latencyMs)
      const method = request.method ?? 'GET'
      const id = userId(request.url)

      if (request.url === starterUsersApiPath && method === 'GET') {
        authorize(request, starterCapabilities.usersRead)
        const pageSize = positiveInteger(queryValue(request, 'pageSize'), 8, 'pageSize')
        const requestedPage = positiveInteger(queryValue(request, 'page'), 1, 'page')
        const keyword = queryValue(request, 'q')?.trim().toLocaleLowerCase()
        const role = queryValue(request, 'role')
        const team = queryValue(request, 'team')
        const status = queryValue(request, 'status')
        const filtered = records.filter((record) => {
          const matchesKeyword =
            !keyword ||
            `${record.name} ${record.email} ${record.team}`.toLocaleLowerCase().includes(keyword)
          return (
            matchesKeyword &&
            (!role || record.role === role) &&
            (!team || record.team === team) &&
            (!status || record.status === status)
          )
        })
        const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
        const page = Math.min(requestedPage, pageCount)
        const start = (page - 1) * pageSize
        const payload: StarterUserPagePayload = {
          items: filtered.slice(start, start + pageSize).map(copyRecord),
          pagination: { page, pageSize, total: filtered.length },
        }
        return response(envelope(payload)) as TransportResponse<TData>
      }

      if (request.url === starterUsersApiPath && method === 'POST') {
        authorize(request, starterCapabilities.usersCreate)
        const input = validateInput(request.body)
        assertUniqueEmail(input.email)
        const record: StarterUserRecord = {
          id: records.reduce((highest, candidate) => Math.max(highest, candidate.id), 0) + 1,
          ...input,
          signIns: 0,
          lastActiveAt: now().toISOString(),
        }
        records = [...records, record]
        return response(envelope(copyRecord(record)), 201) as TransportResponse<TData>
      }

      if (id !== undefined && method === 'GET') {
        authorize(request, starterCapabilities.usersRead)
        return response(envelope(copyRecord(findUser(id)))) as TransportResponse<TData>
      }

      if (id !== undefined && (method === 'PUT' || method === 'PATCH')) {
        authorize(request, starterCapabilities.usersUpdate)
        const input = validateInput(request.body)
        const current = findUser(id)
        assertUniqueEmail(input.email, id)
        const updated: StarterUserRecord = { ...current, ...input }
        records = records.map((record) => (record.id === id ? updated : record))
        return response(envelope(copyRecord(updated))) as TransportResponse<TData>
      }

      if (id !== undefined && method === 'DELETE') {
        authorize(request, starterCapabilities.usersDelete)
        findUser(id)
        records = records.filter((record) => record.id !== id)
        return response(envelope(null)) as TransportResponse<TData>
      }

      throw failure('not-found', 'The API endpoint was not found.', 404)
    },
  }
}
