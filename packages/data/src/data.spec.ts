import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type {
  CursorPaginationMeta,
  DataPage,
  DataSource,
  DataQuery,
  NormalizedError,
  OffsetPaginationMeta,
  PagePaginationMeta,
  QueryFilters,
  StorageAdapter,
  StateSyncAdapter,
} from '@vela-admin/contracts'

import {
  compactFilterValues,
  createDataQuerySearchParamsCodec,
  countActiveFilters,
  changePage,
  changePaginationPageSize,
  displayTableValue,
  emptyFilterValues,
  formatCurrencyTableValue,
  formatNumberTableValue,
  formatPaginationRange,
  formatRelativeTemporalValue,
  formatTemporalTableValue,
  nextPagination,
  normalizePaginationJump,
  previousPagination,
  resolveBooleanTableValue,
  resolveCurrencyTableValue,
  resolvePaginationDisplay,
  resolveIdentityTableValue,
  resolveMediaTableValue,
  resolveProgressTableValue,
  resolveStatusTableValue,
  resolveTrendTableValue,
  useColumnPreferences,
  useCrossPageSelection,
  useDataPage,
  useDataQueryState,
  useSavedViews,
  type DataColumn,
} from './index'

describe('shareable data query state', () => {
  interface Filters extends QueryFilters {
    readonly status?: string
    readonly active?: boolean
  }
  type SortKey = 'name' | 'createdAt'
  const defaults: DataQuery<Filters, SortKey> = {
    filters: {},
    pagination: { mode: 'page', page: 1, pageSize: 25 },
    sort: [],
  }

  it('round-trips typed filters, sort, search, pagination, and unrelated URL parameters', () => {
    const codec = createDataQuerySearchParamsCodec<Filters, SortKey>({
      defaults,
      filters: {
        status: { type: 'string' },
        active: { type: 'boolean', param: 'enabled' },
      },
      allowedSortKeys: ['name', 'createdAt'],
    })
    const decoded = codec.decode(
      new URLSearchParams(
        'tab=activity&filter.status=suspended&enabled=0&q=maya&sort=name:desc&p.mode=page&p.page=3&p.pageSize=50',
      ),
    )

    expect(decoded).toEqual({
      filters: { status: 'suspended', active: false },
      search: 'maya',
      sort: [{ key: 'name', direction: 'desc' }],
      pagination: { mode: 'page', page: 3, pageSize: 50 },
    })
    const encoded = codec.encode(decoded!, new URLSearchParams('tab=activity&filter.status=old'))
    expect(encoded.get('tab')).toBe('activity')
    expect(encoded.get('filter.status')).toBe('suspended')
    expect(encoded.get('enabled')).toBe('0')
    expect(encoded.getAll('sort')).toEqual(['name:desc'])
  })

  it('normalizes every filter type and all pagination modes without trusting URL input', () => {
    interface RichFilters extends QueryFilters {
      readonly enabled?: boolean
      readonly ids?: readonly number[]
      readonly score?: number | null
      readonly tags?: readonly string[]
    }
    type RichSortKey = 'name' | 'score'
    const richDefaults: DataQuery<RichFilters, RichSortKey> = {
      filters: { enabled: false },
      pagination: { mode: 'offset', offset: 10, limit: 20 },
      sort: [{ key: 'name', direction: 'desc' }],
    }
    const codec = createDataQuerySearchParamsCodec<RichFilters, RichSortKey>({
      defaults: richDefaults,
      filters: {
        enabled: { type: 'boolean' },
        ids: { type: 'number-array' },
        score: { type: 'number' },
        tags: { type: 'string-array' },
      },
      allowedSortKeys: ['name', 'score'],
    })

    expect(codec.decode(new URLSearchParams('tab=activity'))).toBeUndefined()
    expect(
      codec.decode(
        new URLSearchParams(
          'filter.enabled=true&filter.ids=1&filter.ids=invalid&filter.ids=2&filter.score=invalid&filter.tags=alpha&filter.tags=beta&sort=score&sort=unknown:asc&sort=name:sideways&p.mode=offset&p.offset=-1&p.limit=0',
        ),
      ),
    ).toEqual({
      filters: {
        enabled: true,
        ids: [1, 2],
        score: undefined,
        tags: ['alpha', 'beta'],
      },
      pagination: { mode: 'offset', offset: 10, limit: 20 },
      sort: [{ key: 'score', direction: 'asc' }],
    })

    const offset = codec.encode(
      {
        filters: { enabled: false, ids: [4, 8], score: 3.5, tags: ['risk', 'review'] },
        pagination: { mode: 'offset', offset: 40, limit: 20 },
        sort: [{ key: 'score', direction: 'desc' }],
      },
      new URLSearchParams('tab=activity&q=stale&filter.score=99'),
    )
    expect(offset.get('tab')).toBe('activity')
    expect(offset.get('q')).toBeNull()
    expect(offset.get('filter.enabled')).toBe('0')
    expect(offset.getAll('filter.ids')).toEqual(['4', '8'])
    expect(offset.getAll('filter.tags')).toEqual(['risk', 'review'])
    expect(offset.get('p.offset')).toBe('40')
    expect(offset.get('p.limit')).toBe('20')

    expect(
      codec.decode(
        new URLSearchParams(
          'filter.enabled=maybe&p.mode=cursor&p.limit=30&p.cursor=next-token&p.direction=forward',
        ),
      ),
    ).toMatchObject({
      filters: { enabled: undefined },
      pagination: { mode: 'cursor', limit: 30, cursor: 'next-token', direction: 'forward' },
      sort: richDefaults.sort,
    })
    const cursor = codec.encode({
      filters: { score: null },
      pagination: { mode: 'cursor', limit: 40, cursor: 'previous-token', direction: 'backward' },
      search: 'maya',
      sort: [],
    })
    expect(cursor.get('filter.score')).toBeNull()
    expect(cursor.get('q')).toBe('maya')
    expect(cursor.get('p.cursor')).toBe('previous-token')
    expect(cursor.get('p.direction')).toBe('backward')

    expect(
      codec.decode(new URLSearchParams('p.mode=page&p.page=0&p.pageSize=invalid')),
    ).toMatchObject({
      pagination: { mode: 'page', page: 1, pageSize: 25 },
    })
  })

  it('resets the page for filter/search/sort transitions and applies external navigation', async () => {
    let subscriber: ((value: DataQuery<Filters, SortKey> | undefined) => void) | undefined
    const writes: DataQuery<Filters, SortKey>[] = []
    const sync: StateSyncAdapter<DataQuery<Filters, SortKey>> = {
      read: () => ({ ...defaults, pagination: { mode: 'page', page: 4, pageSize: 25 } }),
      write: (value) => {
        writes.push(structuredClone(value))
      },
      subscribe: (listener) => {
        subscriber = listener
        return () => {
          subscriber = undefined
        }
      },
    }
    const scope = effectScope()
    const controller = scope.run(() =>
      useDataQueryState({ initialQuery: defaults, sync, immediate: false }),
    )
    if (!controller) throw new Error('Expected a query state scope')

    await controller.hydrate()
    expect(controller.query.value.pagination).toMatchObject({ page: 4 })
    controller.setFilters({ status: 'active' })
    controller.setSearch('maya')
    controller.setSort([{ key: 'createdAt', direction: 'desc' }])
    await controller.flush()
    expect(controller.query.value).toMatchObject({
      filters: { status: 'active' },
      search: 'maya',
      pagination: { page: 1, pageSize: 25 },
    })
    expect(writes).toHaveLength(3)

    subscriber?.({
      filters: { active: false },
      pagination: { mode: 'page', page: 2, pageSize: 50 },
      sort: [],
    })
    expect(controller.query.value.filters).toEqual({ active: false })
    scope.stop()
    expect(subscriber).toBeUndefined()
  })

  it('supports local offset/cursor transitions and contains synchronization failures', async () => {
    const localScope = effectScope()
    const local = localScope.run(() =>
      useDataQueryState({
        initialQuery: {
          filters: {},
          pagination: { mode: 'offset', offset: 50, limit: 25 },
          sort: [],
        },
      }),
    )
    if (!local) throw new Error('Expected a local query controller')
    expect(local.ready.value).toBe(true)
    local.setFilters({ status: 'active' })
    expect(local.query.value.pagination).toEqual({ mode: 'offset', offset: 0, limit: 25 })
    local.paginate({ mode: 'cursor', limit: 30, cursor: 'next' })
    local.setSearch('maya')
    expect(local.query.value.pagination).toEqual({ mode: 'cursor', limit: 30 })
    local.setSearch('')
    expect(local.query.value.search).toBeUndefined()
    local.reset()
    expect(local.query.value.pagination).toEqual({ mode: 'offset', offset: 50, limit: 25 })
    await local.hydrate()
    localScope.stop()

    let failWrites = true
    const sync: StateSyncAdapter<DataQuery<Filters, SortKey>> = {
      read: () => Promise.reject(new Error('URL unavailable')),
      write: () =>
        failWrites ? Promise.reject(new Error('history unavailable')) : Promise.resolve(),
    }
    const failed = useDataQueryState({ initialQuery: defaults, sync, immediate: false })
    failed.setFilters({ status: 'ignored before hydration' })
    await failed.hydrate()
    expect(failed.ready.value).toBe(true)
    expect(failed.error.value).toMatchObject({ message: 'URL unavailable' })
    failed.setSearch('maya', { mode: 'push' })
    await failed.flush()
    expect(failed.error.value).toMatchObject({ message: 'history unavailable' })
    failWrites = false
    failed.setSearch(undefined)
    await failed.flush()
    expect(failed.error.value).toBeUndefined()
  })
})

describe('saved data views', () => {
  it('persists, restores, updates, defaults, and removes named views', async () => {
    const values = new Map<string, unknown>()
    const storage: StorageAdapter = {
      get: <TValue>(key: string) => values.get(key) as TValue | undefined,
      set: (key, value) => {
        values.set(key, structuredClone(value))
      },
      remove: (key) => {
        values.delete(key)
      },
    }
    let nextId = 0
    let now = 100
    const options = {
      storage,
      storageKey: 'users.views',
      immediate: false,
      createId: () => `view-${++nextId}`,
      now: () => ++now,
    }
    const first = useSavedViews(options)
    await first.hydrate()
    const active = first.create('Active users', { filters: { status: 'active' } }, true)
    expect(first.defaultId.value).toBe(active.id)
    expect(() => first.create('active USERS', {})).toThrow('already exists')
    expect(first.update(active.id, { filters: { status: 'suspended' } })).toBe(true)
    expect(first.rename(active.id, 'Needs review')).toBe(true)
    await first.flush()

    const restored = useSavedViews(options)
    await restored.hydrate()
    expect(restored.defaultView.value).toMatchObject({
      id: active.id,
      name: 'Needs review',
      state: { filters: { status: 'suspended' } },
    })
    expect(restored.activate(active.id)).toEqual({ filters: { status: 'suspended' } })
    restored.markModified()
    expect(restored.activeId.value).toBeUndefined()
    expect(restored.remove(active.id)).toBe(true)
    await restored.flush()
    expect(restored.views.value).toEqual([])
  })

  it('rejects invalid operations and contains corrupt or unavailable persistence', async () => {
    const invalidStoredValues: unknown[] = [
      null,
      { version: 2, views: [] },
      { version: 1, views: 'invalid' },
      {
        version: 1,
        defaultId: 'missing',
        views: [
          null,
          { id: '', name: 'Empty id', createdAt: 1, updatedAt: 1, state: {} },
          { id: 'empty-name', name: '', createdAt: 1, updatedAt: 1, state: {} },
          { id: 'bad-time', name: 'Bad time', createdAt: Number.NaN, updatedAt: 1, state: {} },
          { id: 'valid', name: 'Valid', createdAt: 1, updatedAt: 2, state: { page: 1 } },
        ],
      },
    ]
    let storedIndex = 0
    const storage: StorageAdapter = {
      get: <TValue>() => invalidStoredValues[storedIndex++] as TValue | undefined,
      set: () => undefined,
      remove: () => undefined,
    }

    for (let index = 0; index < invalidStoredValues.length; index += 1) {
      const views = useSavedViews({ storage, storageKey: 'invalid', immediate: false })
      await views.hydrate()
      if (index === invalidStoredValues.length - 1) {
        expect(views.views.value).toHaveLength(1)
        expect(views.defaultId.value).toBeUndefined()
      } else {
        expect(views.views.value).toEqual([])
      }
    }

    let removeFails = true
    const unavailable = useSavedViews({
      storage: {
        get: () => Promise.reject(new Error('read failed')),
        set: () => Promise.reject(new Error('write failed')),
        remove: () =>
          removeFails ? Promise.reject(new Error('remove failed')) : Promise.resolve(),
      },
      storageKey: 'unavailable',
      maxViews: 1,
      immediate: false,
      createId: () => 'only-view',
      now: () => 1,
    })
    await unavailable.hydrate()
    expect(unavailable.error.value).toMatchObject({ message: 'read failed' })
    expect(unavailable.update('missing', {})).toBe(false)
    expect(unavailable.rename('missing', 'Name')).toBe(false)
    expect(unavailable.remove('missing')).toBe(false)
    expect(unavailable.setDefault('missing')).toBe(false)
    expect(unavailable.activate('missing')).toBeUndefined()
    expect(() => unavailable.create('   ', {})).toThrow('cannot be empty')

    unavailable.create('Only view', {})
    expect(() => unavailable.create('Overflow', {})).toThrow(RangeError)
    expect(unavailable.setDefault('only-view')).toBe(true)
    expect(unavailable.setDefault(undefined)).toBe(true)
    await unavailable.flush()
    expect(unavailable.error.value).toMatchObject({ message: 'write failed' })
    await unavailable.clear()
    expect(unavailable.error.value).toMatchObject({ message: 'remove failed' })
    removeFails = false
    await unavailable.clear()
    expect(unavailable.error.value).toBeUndefined()
  })
})

describe('table cell presentation', () => {
  it('normalizes primitive, empty, and unsupported cell values safely', () => {
    expect(displayTableValue(null)).toBe('—')
    expect(displayTableValue(undefined)).toBe('—')
    expect(displayTableValue('')).toBe('—')
    expect(displayTableValue('Vela')).toBe('Vela')
    expect(displayTableValue(42)).toBe('42')
    expect(displayTableValue(42n)).toBe('42')
    expect(displayTableValue(false)).toBe('false')
    expect(displayTableValue(new Date('2026-08-27T12:30:00.000Z'))).toBe('2026-08-27T12:30:00.000Z')
    expect(displayTableValue(new Date('invalid'))).toBe('—')
    expect(displayTableValue(Symbol('vela'))).toBe('vela')
    expect(displayTableValue(Symbol())).toBe('—')
    expect(displayTableValue({ value: 'not implicitly serialized' })).toBe('—')
  })

  it('resolves identity cells without assuming a backend record shape', () => {
    expect(
      resolveIdentityTableValue({
        primary: 'Maya Chen',
        secondary: '#42 · London',
        image: 'https://example.dev/avatar.png',
        icon: 'account',
      }),
    ).toEqual({
      primary: 'Maya Chen',
      secondary: '#42 · London',
      image: 'https://example.dev/avatar.png',
      icon: 'account',
    })
    expect(resolveIdentityTableValue('Standalone label')).toEqual({
      primary: 'Standalone label',
    })
    expect(
      resolveIdentityTableValue({ primary: null, secondary: '', image: '', icon: '' }),
    ).toEqual({ primary: '—' })
  })

  it('resolves media cells as semantic image and copy pairs', () => {
    expect(
      resolveMediaTableValue({
        primary: 'Campaign artwork',
        secondary: '1600 × 900',
        image: 'https://example.dev/campaign.webp',
        alt: 'Summer campaign artwork',
      }),
    ).toEqual({
      primary: 'Campaign artwork',
      secondary: '1600 × 900',
      image: 'https://example.dev/campaign.webp',
      alt: 'Summer campaign artwork',
    })
    expect(resolveMediaTableValue('No preview')).toEqual({
      primary: 'No preview',
      alt: 'No preview',
    })
  })

  it('formats number cells with optional semantic affixes', () => {
    expect(
      formatNumberTableValue(1280, {
        kind: 'number',
        locale: 'en-GB',
        notation: 'compact',
        maximumFractionDigits: 1,
        prefix: '~',
        suffix: 'users',
      }),
    ).toBe('~1.3k users')
    expect(formatNumberTableValue('not-a-number', { kind: 'number' })).toBe('not-a-number')
    expect(formatNumberTableValue(12, { kind: 'number', locale: 'en_XX' })).toBe('12')
  })

  it('formats currency without coupling the schema to a backend payload shape', () => {
    expect(
      formatCurrencyTableValue('1280.5', {
        kind: 'currency',
        currency: 'GBP',
        currencyDisplay: 'code',
        locale: 'en-GB',
      }),
    ).toBe('GBP 1,280.50')
    expect(formatCurrencyTableValue('not-a-number', { kind: 'currency', currency: 'GBP' })).toBe(
      'not-a-number',
    )
    expect(
      formatCurrencyTableValue(12, {
        kind: 'currency',
        currency: 'USD',
        locale: ['en-US', 'en'],
        notation: 'compact',
      }),
    ).toBe('$12')
    expect(
      formatCurrencyTableValue(Number.POSITIVE_INFINITY, { kind: 'currency', currency: 'GBP' }),
    ).toBe('Infinity')
    expect(formatCurrencyTableValue(' ', { kind: 'currency', currency: 'GBP' })).toBe(' ')
    expect(formatCurrencyTableValue(12, { kind: 'currency', currency: 'not-valid' })).toBe('12')
  })

  it('exposes currency parts for restrained symbol and fractional styling', () => {
    const resolved = resolveCurrencyTableValue(1280.5, {
      kind: 'currency',
      currency: 'GBP',
      locale: 'en-GB',
      showSign: true,
    })

    expect(resolved.numeric).toBe(1280.5)
    expect(resolved.formatted).toContain('£')
    expect(resolved.parts.some((part) => part.type === 'currency' && part.value === '£')).toBe(true)
    expect(resolved.parts.some((part) => part.type === 'plusSign')).toBe(true)
  })

  it('formats date values with an explicit locale and timezone', () => {
    const presentation = {
      kind: 'datetime',
      locale: 'en-GB',
      timeZone: 'Europe/London',
      dateStyle: 'short',
      timeStyle: 'short',
    } as const

    expect(formatTemporalTableValue('2026-08-27T12:30:00.000Z', presentation)).toBe(
      '27/08/2026, 13:30',
    )
    expect(formatTemporalTableValue('invalid', presentation)).toBe('invalid')
    expect(
      formatTemporalTableValue(0, {
        kind: 'date',
        locale: ['en-GB', 'en'],
        dateStyle: 'short',
      }),
    ).toBe('01/01/1970')
    expect(formatTemporalTableValue({}, presentation)).toBe('—')
    expect(formatTemporalTableValue(new Date('invalid'), presentation)).toBe('—')
    expect(
      formatTemporalTableValue('2026-08-27T12:30:00.000Z', {
        kind: 'date',
        locale: 'en_XX',
      }),
    ).toBe('2026-08-27T12:30:00.000Z')
  })

  it('derives relative and semantic status values with safe fallbacks', () => {
    expect(
      formatRelativeTemporalValue('2026-08-26T12:00:00.000Z', {
        kind: 'datetime',
        locale: 'en',
        relative: true,
        relativeTo: '2026-08-27T12:00:00.000Z',
      }),
    ).toBe('yesterday')
    expect(
      resolveStatusTableValue('active', {
        kind: 'status',
        values: { active: { label: 'Active', tone: 'success', icon: 'check' } },
      }),
    ).toEqual({ label: 'Active', tone: 'success', icon: 'check' })
    expect(resolveStatusTableValue(null, { kind: 'status' })).toEqual({
      label: '—',
      tone: 'neutral',
    })
    expect(
      resolveStatusTableValue('unknown', {
        kind: 'status',
        fallback: { label: 'Pending review', tone: 'warning' },
      }),
    ).toEqual({ label: 'Pending review', tone: 'warning' })
  })

  it('normalizes boolean, progress, and trend values without backend assumptions', () => {
    expect(
      resolveBooleanTableValue(1, {
        kind: 'boolean',
        trueValues: [true, 1],
        falseValues: [false, 0],
        trueState: { label: 'Enabled', tone: 'success', icon: 'check' },
      }),
    ).toEqual({ state: 'true', label: 'Enabled', tone: 'success', icon: 'check' })
    expect(resolveBooleanTableValue('unknown', { kind: 'boolean' })).toEqual({
      state: 'unknown',
      tone: 'neutral',
    })

    expect(
      resolveProgressTableValue(
        { value: 75, max: 150, secondary: '3 of 6 stages' },
        { kind: 'progress', locale: 'en-GB' },
      ),
    ).toEqual({
      value: 75,
      max: 150,
      ratio: 0.5,
      percentage: 50,
      label: '50%',
      secondary: '3 of 6 stages',
    })
    expect(resolveProgressTableValue(125, { kind: 'progress', min: 0, max: 100 })).toMatchObject({
      value: 125,
      ratio: 1,
      percentage: 100,
    })
    expect(resolveProgressTableValue('invalid', { kind: 'progress' })).toBeUndefined()

    const falling = resolveTrendTableValue(
      { value: 1280, delta: -4.2, secondary: 'vs previous period' },
      {
        kind: 'trend',
        locale: 'en-GB',
        suffix: 'orders',
        maximumFractionDigits: 1,
      },
    )
    expect(falling).toMatchObject({
      value: '1,280 orders',
      direction: 'down',
      tone: 'danger',
      secondary: 'vs previous period',
    })
    expect(falling?.delta).toContain('4.2%')
    expect(
      resolveTrendTableValue(
        { value: -73.25, delta: 1.4 },
        {
          kind: 'trend',
          currency: 'GBP',
          locale: 'en-GB',
          maximumFractionDigits: 1,
        },
      ),
    ).toMatchObject({ value: '-£73.3', direction: 'up', tone: 'success' })
    expect(
      resolveTrendTableValue({ value: 12, delta: 2 }, { kind: 'trend', higherIsBetter: false }),
    ).toMatchObject({ direction: 'up', tone: 'danger' })
    expect(resolveTrendTableValue({}, { kind: 'trend' })).toBeUndefined()
  })

  it('chooses a readable relative unit and fails safely for invalid inputs', () => {
    const reference = '2026-08-27T12:00:00.000Z'
    const relative = (value: string, locale = 'en') =>
      formatRelativeTemporalValue(value, {
        kind: 'datetime',
        relative: true,
        relativeTo: reference,
        locale,
      })

    expect(
      formatRelativeTemporalValue(reference, { kind: 'datetime', relative: false }),
    ).toBeUndefined()
    expect(relative('invalid')).toBeUndefined()
    expect(
      formatRelativeTemporalValue(reference, {
        kind: 'datetime',
        relative: true,
        relativeTo: 'invalid',
      }),
    ).toBeUndefined()
    expect(relative('2026-08-27T12:00:30.000Z')).toBe('in 30 seconds')
    expect(relative('2026-08-27T12:30:00.000Z')).toBe('in 30 minutes')
    expect(relative('2026-08-27T15:00:00.000Z')).toBe('in 3 hours')
    expect(relative('2026-09-06T12:00:00.000Z')).toBe('in 10 days')
    expect(relative('2026-10-26T12:00:00.000Z')).toBe('in 2 months')
    expect(relative('2028-08-26T12:00:00.000Z')).toBe('in 2 years')
    expect(relative('2026-08-27T12:00:30.000Z', 'en_XX')).toBeUndefined()
  })
})

const normalizeError = (cause: unknown): NormalizedError => ({
  kind: 'unknown',
  message: cause instanceof Error ? cause.message : 'Unknown',
  retryable: false,
  cause,
})

describe('filter values', () => {
  it('removes inactive values without changing backend keys', () => {
    const values = compactFilterValues({ keyword: '', status: 0, enabled: false, tags: [] })
    expect(values).toEqual({ status: 0, enabled: false })
    expect(countActiveFilters(values)).toBe(2)
  })

  it('builds an explicit empty shape for schema-controlled fields', () => {
    expect(
      emptyFilterValues([
        { key: 'keyword', label: 'Keyword', kind: 'text' },
        { key: 'status', label: 'Status', kind: 'select', options: [] },
      ]),
    ).toEqual({ keyword: undefined, status: undefined })
  })
})

describe('pagination presentation', () => {
  it('derives page ranges from the rendered row count', () => {
    const pagination: PagePaginationMeta = {
      mode: 'page',
      page: 3,
      pageSize: 25,
      total: 63,
      pageCount: 3,
    }
    const display = resolvePaginationDisplay(pagination, 13)

    expect(display).toMatchObject({ start: 51, end: 63, total: 63, canNext: false })
    expect(formatPaginationRange(display)).toBe('51–63 of 63')
    expect(changePaginationPageSize(pagination, 50)).toEqual({
      mode: 'page',
      page: 1,
      pageSize: 50,
    })
  })

  it('moves offset pagination without requiring a total', () => {
    const pagination: OffsetPaginationMeta = {
      mode: 'offset',
      offset: 25,
      limit: 25,
      hasMore: true,
    }
    const display = resolvePaginationDisplay(pagination, 25)

    expect(formatPaginationRange(display)).toBe('26–50')
    expect(previousPagination(pagination)).toEqual({ mode: 'offset', offset: 0, limit: 25 })
    expect(nextPagination(pagination)).toEqual({ mode: 'offset', offset: 50, limit: 25 })
  })

  it('turns cursor metadata into opaque directional requests', () => {
    const pagination: CursorPaginationMeta = {
      mode: 'cursor',
      limit: 25,
      previousCursor: 'before',
      nextCursor: 'after',
      hasPrevious: true,
      hasNext: true,
    }

    expect(previousPagination(pagination)).toEqual({
      mode: 'cursor',
      cursor: 'before',
      limit: 25,
      direction: 'backward',
    })
    expect(nextPagination(pagination)).toEqual({
      mode: 'cursor',
      cursor: 'after',
      limit: 25,
      direction: 'forward',
    })
    expect(changePaginationPageSize(pagination, 50)).toEqual({ mode: 'cursor', limit: 50 })
    expect(formatPaginationRange({ ...resolvePaginationDisplay(pagination, 1) })).toBe('1 row')
  })

  it('handles empty, terminal, and invalid pagination boundaries', () => {
    const firstPage: PagePaginationMeta = {
      mode: 'page',
      page: 1,
      pageSize: 15,
      total: -1,
      pageCount: 0,
    }
    const offsetEnd: OffsetPaginationMeta = {
      mode: 'offset',
      offset: 0,
      limit: 15,
      total: -2,
      hasMore: false,
    }

    expect(resolvePaginationDisplay(firstPage, -3)).toMatchObject({
      start: 0,
      end: 0,
      total: 0,
      pageCount: 1,
      canPrevious: false,
      canNext: false,
    })
    expect(resolvePaginationDisplay(offsetEnd, 0)).toMatchObject({
      start: 0,
      end: 0,
      total: 0,
      canPrevious: false,
      canNext: false,
    })
    expect(previousPagination(firstPage)).toBeUndefined()
    expect(nextPagination(firstPage)).toBeUndefined()
    expect(previousPagination(offsetEnd)).toBeUndefined()
    expect(nextPagination(offsetEnd)).toBeUndefined()
    expect(() => changePaginationPageSize(firstPage, 0)).toThrow(RangeError)
    expect(() => changePage(offsetEnd, 2)).toThrow(TypeError)
    expect(() => changePage(firstPage, 0)).toThrow(RangeError)
    expect(changePage(firstPage, 2)).toEqual({ mode: 'page', page: 2, pageSize: 15 })
    expect(normalizePaginationJump('52', 52)).toBe(52)
    expect(normalizePaginationJump('999', 52)).toBe(52)
    expect(normalizePaginationJump(0, 52)).toBe(1)
    expect(normalizePaginationJump('2.5', 52)).toBeUndefined()
    expect(normalizePaginationJump('', 52)).toBeUndefined()
  })
})

describe('useDataPage', () => {
  it('ignores stale results and keeps previous data while refreshing', async () => {
    const resolvers: ((value: DataPage<string, PagePaginationMeta>) => void)[] = []
    const source: DataSource<string, { keyword?: string }, string, PagePaginationMeta> = {
      load: vi.fn(
        () =>
          new Promise<DataPage<string, PagePaginationMeta>>((resolve) => {
            resolvers.push(resolve)
          }),
      ),
    }
    const query = ref({
      filters: { keyword: 'first' },
      pagination: { mode: 'page' as const, page: 1, pageSize: 25 },
      sort: [],
    })
    const scope = effectScope()
    const page = scope.run(() => useDataPage({ source, query, normalizeError }))
    if (!page) throw new Error('Expected a data page scope')
    await nextTick()
    query.value = { ...query.value, filters: { keyword: 'second' } }
    await nextTick()
    const firstResult: DataPage<string, PagePaginationMeta> = {
      items: ['stale'],
      pagination: { mode: 'page', page: 1, pageSize: 25, total: 1, pageCount: 1 },
    }
    const secondResult: DataPage<string, PagePaginationMeta> = {
      items: ['current'],
      pagination: { mode: 'page', page: 1, pageSize: 25, total: 1, pageCount: 1 },
    }
    resolvers[0]?.(firstResult)
    resolvers[1]?.(secondResult)
    await Promise.resolve()
    await nextTick()

    expect(page.items.value).toEqual(['current'])
    scope.stop()
  })

  it('keeps settled data on refresh failures and exposes normalized errors', async () => {
    let call = 0
    const pagination: PagePaginationMeta = {
      mode: 'page',
      page: 1,
      pageSize: 25,
      total: 1,
      pageCount: 1,
    }
    const source: DataSource<string, Record<string, never>, string, PagePaginationMeta> = {
      load: () => {
        call += 1
        return call === 1
          ? Promise.resolve({ items: ['settled'], pagination })
          : Promise.reject(new Error('offline'))
      },
    }
    const scope = effectScope()
    const page = scope.run(() =>
      useDataPage({
        source,
        query: { filters: {}, pagination: { mode: 'page', page: 1, pageSize: 25 }, sort: [] },
        immediate: false,
        normalizeError,
      }),
    )
    if (!page) throw new Error('Expected a data page scope')

    expect(page.state.value.status).toBe('idle')
    const first = page.execute()
    expect(page.loading.value).toBe(true)
    await first
    expect(page.items.value).toEqual(['settled'])
    const refresh = page.refresh()
    expect(page.refreshing.value).toBe(true)
    await refresh
    expect(page.items.value).toEqual(['settled'])
    expect(page.error.value?.message).toBe('offline')
    scope.stop()
  })

  it('restores idle or settled state when an in-flight request is cancelled', async () => {
    const pagination: PagePaginationMeta = {
      mode: 'page',
      page: 1,
      pageSize: 25,
      total: 1,
      pageCount: 1,
    }
    let resolveLoad!: (page: DataPage<string, PagePaginationMeta>) => void
    const source: DataSource<string, Record<string, never>, string, PagePaginationMeta> = {
      load: (_query, context) =>
        new Promise<DataPage<string, PagePaginationMeta>>((resolve, reject) => {
          resolveLoad = resolve
          context.signal.addEventListener('abort', () =>
            reject(new DOMException('stop', 'AbortError')),
          )
        }),
    }
    const scope = effectScope()
    const page = scope.run(() =>
      useDataPage({
        source,
        query: { filters: {}, pagination: { mode: 'page', page: 1, pageSize: 25 }, sort: [] },
        immediate: false,
        normalizeError: (cause) => ({
          kind: cause instanceof DOMException ? 'cancelled' : 'unknown',
          message: 'Stopped',
          retryable: false,
        }),
      }),
    )
    if (!page) throw new Error('Expected a data page scope')

    const initial = page.execute()
    page.cancel()
    await initial
    expect(page.state.value.status).toBe('idle')

    const settled = page.execute()
    resolveLoad({ items: ['current'], pagination })
    await settled
    const refreshing = page.refresh()
    page.cancel()
    await refreshing
    expect(page.state.value.status).toBe('success')
    expect(page.items.value).toEqual(['current'])
    scope.stop()
  })

  it('migrates version one preferences and persists bounded custom widths', async () => {
    interface Row {
      readonly id: number
      readonly name: string
    }
    const columns: readonly DataColumn<Row>[] = [
      { key: 'name', title: 'Name', value: 'name', resize: { min: 120, max: 360 } },
      { key: 'actions', title: 'Actions', role: 'actions' },
    ]
    const writes: unknown[] = []
    const storage: StorageAdapter = {
      get: <TValue>() =>
        Promise.resolve({
          version: 1,
          state: { order: ['name', 'actions'], hidden: [] },
        } as TValue),
      set: (_key, value) => {
        writes.push(value)
        return Promise.resolve()
      },
      remove: () => Promise.resolve(),
    }
    const scope = effectScope()
    const preferences = scope.run(() =>
      useColumnPreferences({ columns, storage, storageKey: 'accounts.columns', immediate: false }),
    )
    if (!preferences) throw new Error('Expected column preference scope')

    await preferences.hydrate()
    expect(preferences.state.value.widths).toEqual({})
    expect(preferences.setWidth('name', 999)).toBe(true)
    expect(preferences.setWidth('actions', 200)).toBe(false)
    expect(preferences.visibleColumns.value[0]?.sizing).toEqual({ mode: 'fixed', size: 360 })
    expect(writes.at(-1)).toEqual({
      version: 2,
      state: { order: ['name', 'actions'], hidden: [], widths: { name: 360 } },
    })
    expect(preferences.resetWidth('name')).toBe(true)
    expect(preferences.resetWidth('name')).toBe(false)
    scope.stop()
  })
})

describe('column preferences', () => {
  it('hydrates schema-aware visibility and preserves structural columns', async () => {
    interface Row {
      readonly id: number
      readonly name: string
      readonly email: string
    }
    const columns: readonly DataColumn<Row>[] = [
      { key: 'name', title: 'Name', value: 'name' },
      { key: 'email', title: 'Email', value: 'email' },
      { key: 'actions', title: 'Actions', role: 'actions' },
    ]
    const stored = {
      version: 1,
      state: { order: ['email', 'unknown', 'name', 'actions'], hidden: ['email', 'actions'] },
    }
    const removed: string[] = []
    const storage: StorageAdapter = {
      get: <TValue>() => Promise.resolve(stored as TValue),
      set: () => Promise.resolve(),
      remove: (key) => {
        removed.push(key)
        return Promise.resolve()
      },
    }
    const scope = effectScope()
    const preferences = scope.run(() =>
      useColumnPreferences({
        columns,
        storage,
        storageKey: 'accounts.columns',
        immediate: false,
      }),
    )
    if (!preferences) throw new Error('Expected column preference scope')

    await preferences.hydrate()
    expect(preferences.orderedColumns.value.map((column) => column.key)).toEqual([
      'email',
      'name',
      'actions',
    ])
    expect(preferences.visibleColumns.value.map((column) => column.key)).toEqual([
      'name',
      'actions',
    ])
    expect(preferences.setVisible('name', false)).toBe(false)
    expect(preferences.setVisible('email', true)).toBe(true)
    expect(preferences.move('email', 1)).toBe(true)
    expect(preferences.orderedColumns.value.map((column) => column.key)).toEqual([
      'name',
      'email',
      'actions',
    ])
    await preferences.reset()
    expect(preferences.visibleColumns.value.map((column) => column.key)).toEqual([
      'name',
      'email',
      'actions',
    ])
    expect(removed).toEqual(['accounts.columns'])
    scope.stop()
  })
})

describe('cross-page selection', () => {
  it('retains explicit keys across pages and derives each page state', () => {
    const selection = useCrossPageSelection<number>()

    selection.togglePage([1, 2, 3], true)
    selection.setSelected(2, false)
    selection.togglePage([11, 12], true)

    expect(selection.pageState([1, 2, 3])).toBe('some')
    expect(selection.pageState([11, 12])).toBe('all')
    expect(selection.selectedCount.value).toBe(4)
    expect(selection.snapshot()).toEqual({ mode: 'explicit', keys: [1, 3, 11, 12] })
  })

  it('represents all matching rows with exclusions instead of materializing every key', () => {
    const selection = useCrossPageSelection<number>()

    selection.togglePage([1, 2], true)
    selection.selectAllMatching(10_000)
    selection.setSelected(2, false)
    selection.togglePage([10, 11], false)

    expect(selection.mode.value).toBe('all')
    expect(selection.selectedCount.value).toBe(9_997)
    expect(selection.isSelected(1)).toBe(true)
    expect(selection.isSelected(2)).toBe(false)
    expect(selection.snapshot()).toEqual({ mode: 'all', except: [2, 10, 11], total: 10_000 })
    expect(() => selection.selectAllMatching(-1)).toThrow(RangeError)
  })

  it('clears selection when the filter or sort scope changes', async () => {
    const scopeKey = ref({ filters: { status: 'active' }, sort: ['name'] })
    const lifecycle = effectScope()
    const selection = lifecycle.run(() =>
      useCrossPageSelection<number>({
        scope: scopeKey,
      }),
    )
    if (!selection) throw new Error('Expected a selection scope')

    selection.togglePage([1, 2], true)
    scopeKey.value = { filters: { status: 'suspended' }, sort: ['name'] }
    await nextTick()

    expect(selection.hasSelection.value).toBe(false)
    expect(selection.snapshot()).toEqual({ mode: 'explicit', keys: [] })
    lifecycle.stop()
  })
})
