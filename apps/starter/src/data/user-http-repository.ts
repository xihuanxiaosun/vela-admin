import {
  createPageResponseAdapter,
  encodePagePagination,
  serializeFilters,
  type EncodedQuery,
  type EncodedQueryValue,
} from '@vela-admin/adapters'
import type { TransportAdapter } from '@vela-admin/contracts'

import type { StarterUserInput, StarterUserRecord, StarterUserRepository } from './users'

export const starterUsersApiPath = '/api/users'

export interface StarterApiEnvelope<TData> {
  readonly data: TData
}

export interface StarterUserPagePayload {
  readonly items: readonly StarterUserRecord[]
  readonly pagination: {
    readonly page: number
    readonly pageSize: number
    readonly total: number
  }
}

const adaptUserPage = createPageResponseAdapter<
  StarterApiEnvelope<StarterUserPagePayload>,
  StarterUserRecord
>({
  items: 'data.items',
  total: 'data.pagination.total',
  page: 'data.pagination.page',
  pageSize: 'data.pagination.pageSize',
})

function encodeQueryValue(value: EncodedQueryValue): string | readonly string[] {
  return Array.isArray(value) ? value.map(String) : String(value)
}

function toTransportQuery(
  ...parts: readonly EncodedQuery[]
): Readonly<Record<string, string | readonly string[] | undefined>> {
  const query: Record<string, string | readonly string[] | undefined> = {}
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      query[key] = value === undefined ? undefined : encodeQueryValue(value)
    }
  }
  return query
}

function userPath(id: number): string {
  return `${starterUsersApiPath}/${encodeURIComponent(String(id))}`
}

/** Maps the Starter's domain repository to a replaceable HTTP transport contract. */
export function createHttpStarterUserRepository(
  transport: TransportAdapter,
): StarterUserRepository {
  return {
    async list(query, signal) {
      const response = await transport.request<StarterApiEnvelope<StarterUserPagePayload>>({
        url: starterUsersApiPath,
        query: toTransportQuery(
          encodePagePagination(query.pagination, { pageSize: 'pageSize' }),
          serializeFilters(query.filters, {
            omitEmptyString: true,
            omitNull: true,
            keyMap: { keyword: 'q' },
          }),
        ),
        signal,
      })
      return adaptUserPage(response.data, query.pagination)
    },

    async get(id, signal) {
      const response = await transport.request<StarterApiEnvelope<StarterUserRecord>>({
        url: userPath(id),
        signal,
      })
      return response.data.data
    },

    async create(input, signal) {
      const response = await transport.request<
        StarterApiEnvelope<StarterUserRecord>,
        StarterUserInput
      >({
        url: starterUsersApiPath,
        method: 'POST',
        body: input,
        signal,
      })
      return response.data.data
    },

    async update(id, input, signal) {
      const response = await transport.request<
        StarterApiEnvelope<StarterUserRecord>,
        StarterUserInput
      >({
        url: userPath(id),
        method: 'PUT',
        body: input,
        signal,
      })
      return response.data.data
    },

    async remove(id, signal) {
      await transport.request<StarterApiEnvelope<null>>({
        url: userPath(id),
        method: 'DELETE',
        signal,
      })
    },
  }
}
