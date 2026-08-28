<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  mdiDownloadOutline,
  mdiEyeOutline,
  mdiPencilOutline,
  mdiRefresh,
  mdiTrashCanOutline,
} from '@mdi/js'
import { VSwitch } from 'vuetify/components'
import { createUrlStateAdapter, createWebStorageAdapter } from '@vela-admin/adapters'
import type {
  DataQuery,
  PagePagination,
  PagePaginationMeta,
  PaginationRequest,
} from '@vela-admin/contracts'
import {
  VaColumnManager,
  VaDataPage,
  VaFilterBar,
  VaRowActions,
  VaSavedViewPicker,
  VaSelectionBar,
  createDataQuerySearchParamsCodec,
  createCsvDocument,
  useColumnPreferences,
  useCrossPageSelection,
  useDataQueryState,
  useSavedViews,
  type DataColumn,
  type FilterField,
  type FilterValues,
  type RowAction,
} from '@vela-admin/data'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton } from '@vela-admin/ui'

import { demoAccounts, type DemoAccount } from '../demo/data'
import { localizedOption, playgroundFormatLocale, translateDemoLabel } from '../demo/localization'
import { createDemoTablePresentations } from '../demo/table-presentations'

const emit = defineEmits<{
  message: [value: string]
}>()
const locale = useVelaLocale()
const presentations = computed(() => createDemoTablePresentations(locale.t, locale.locale.value))

type AccountSortKey = 'lastSeenAt' | 'name' | 'status'
type AccountFilters = FilterValues & {
  readonly keyword?: string
  readonly minimumSignIns?: number
  readonly status?: string
  readonly team?: string
}

const pageSizes = [15, 25, 50, 100] as const
const defaultPagination: PagePagination = { mode: 'page', page: 1, pageSize: 15 }
const initialQuery: DataQuery<AccountFilters, AccountSortKey> = {
  filters: {},
  pagination: defaultPagination,
  sort: [],
}
const queryCodec = createDataQuerySearchParamsCodec<AccountFilters, AccountSortKey>({
  defaults: initialQuery,
  filters: {
    keyword: { type: 'string' },
    minimumSignIns: { type: 'number' },
    status: { type: 'string' },
    team: { type: 'string' },
  },
  prefix: 'accounts.filter.',
  paginationPrefix: 'accounts.page.',
  searchParam: 'accounts.q',
  sortParam: 'accounts.sort',
  allowedSortKeys: ['lastSeenAt', 'name', 'status'],
})
const storage = createWebStorageAdapter(window.localStorage, { namespace: 'vela-playground' })

function normalizeAccountQuery(
  query: DataQuery<AccountFilters, AccountSortKey>,
): DataQuery<AccountFilters, AccountSortKey> {
  const pagination = query.pagination
  const pageSize =
    pagination.mode === 'page' &&
    pageSizes.includes(pagination.pageSize as (typeof pageSizes)[number])
      ? pagination.pageSize
      : defaultPagination.pageSize
  return {
    ...query,
    pagination: {
      mode: 'page',
      page: pagination.mode === 'page' ? Math.max(1, pagination.page) : 1,
      pageSize,
    },
  }
}

const queryState = useDataQueryState<AccountFilters, AccountSortKey>({
  initialQuery,
  normalize: normalizeAccountQuery,
  sync: createUrlStateAdapter({
    codec: queryCodec,
    location: window.location,
    history: window.history,
    events: window,
  }),
})
const savedViews = useSavedViews<DataQuery<AccountFilters, AccountSortKey>>({
  storage,
  storageKey: 'data-demo.saved-views',
})
const stressLayout = ref(false)
const loading = ref(false)
const filters = computed(() => queryState.query.value.filters)
const pagination = computed<PagePagination>(() => {
  const value = queryState.query.value.pagination
  return value.mode === 'page' ? value : defaultPagination
})

const filterFields = computed<readonly FilterField[]>(() => [
  {
    key: 'keyword',
    kind: 'text',
    label: locale.t('playground.common.search'),
    placeholder: locale.t('playground.data.searchPlaceholder'),
    pinned: true,
  },
  {
    key: 'status',
    kind: 'select',
    label: locale.t('playground.common.status'),
    pinned: true,
    options: [
      localizedOption(locale.t, 'active'),
      localizedOption(locale.t, 'invited'),
      localizedOption(locale.t, 'suspended'),
    ],
  },
  {
    key: 'team',
    kind: 'select',
    label: locale.t('playground.common.team'),
    options: [
      localizedOption(locale.t, 'Operations'),
      localizedOption(locale.t, 'Growth'),
      localizedOption(locale.t, 'Finance'),
      localizedOption(locale.t, 'Content'),
    ],
  },
  {
    key: 'minimumSignIns',
    kind: 'number',
    label: locale.t('playground.data.minimumSignIns'),
    min: 0,
  },
])

const primaryColumns = computed<readonly DataColumn<DemoAccount>[]>(() => [
  {
    key: 'name',
    title: locale.t('playground.common.account'),
    role: 'identity',
    sizing: { mode: 'fill', min: 180, max: 280 },
    overflow: 'ellipsis',
    sortable: true,
  },
  {
    key: 'email',
    title: locale.t('playground.common.email'),
    sizing: { mode: 'content', min: 190, max: 280 },
    overflow: 'ellipsis',
  },
  {
    key: 'status',
    title: locale.t('playground.common.status'),
    role: 'status',
    dataType: 'status',
    presentation: presentations.value.accountStatus,
  },
  {
    key: 'lastSeenAt',
    title: locale.t('playground.common.lastSeen'),
    dataType: 'datetime',
    presentation: presentations.value.standardDateTime,
    sizing: { mode: 'content', min: 150, max: 180 },
  },
])

const extendedColumns = computed<readonly DataColumn<DemoAccount>[]>(() => [
  {
    key: 'role',
    title: locale.t('playground.common.role'),
    value: (item) => translateDemoLabel(locale.t, item.role),
  },
  {
    key: 'team',
    title: locale.t('playground.common.team'),
    value: (item) => translateDemoLabel(locale.t, item.team),
  },
  {
    key: 'region',
    title: locale.t('playground.common.region'),
    value: (item) => translateDemoLabel(locale.t, item.region),
  },
  { key: 'signIns', title: locale.t('playground.common.signIns'), dataType: 'number' },
  {
    key: 'revenue',
    title: locale.t('playground.common.revenue'),
    dataType: 'currency',
    presentation: presentations.value.sterling,
  },
  {
    key: 'createdAt',
    title: locale.t('playground.common.created'),
    dataType: 'date',
    presentation: presentations.value.standardDate,
  },
  {
    key: 'note',
    title: locale.t('playground.common.notes'),
    value: (item) => translateDemoLabel(locale.t, item.note),
    sizing: { mode: 'content', min: 180, max: 320 },
    overflow: 'ellipsis',
  },
])

const actionColumn = computed<DataColumn<DemoAccount>>(() => ({
  key: 'actions',
  title: locale.t('playground.common.actions'),
  role: 'actions',
}))

const columns = computed<readonly DataColumn<DemoAccount>[]>(() => [
  ...primaryColumns.value,
  ...(stressLayout.value ? extendedColumns.value : []),
  actionColumn.value,
])

const columnPreferences = useColumnPreferences({
  columns,
  storageKey: 'data-demo.columns',
  storage,
})

const selection = useCrossPageSelection<number>({
  scope: computed(() => ({ filters: filters.value, sort: queryState.query.value.sort })),
})

const filteredAccounts = computed(() => {
  const keyword = String(filters.value.keyword ?? '')
    .trim()
    .toLocaleLowerCase()
  const status = filters.value.status
  const team = filters.value.team
  const minimumSignIns = Number(filters.value.minimumSignIns ?? 0)
  return demoAccounts.filter(
    (account) =>
      (!keyword || `${account.name} ${account.email}`.toLocaleLowerCase().includes(keyword)) &&
      (!status || account.status === status) &&
      (!team || account.team === team) &&
      account.signIns >= minimumSignIns,
  )
})

const items = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  return filteredAccounts.value.slice(start, start + pagination.value.pageSize)
})

const paginationMeta = computed<PagePaginationMeta>(() => ({
  ...pagination.value,
  total: filteredAccounts.value.length,
  pageCount: Math.max(1, Math.ceil(filteredAccounts.value.length / pagination.value.pageSize)),
}))

const currentPageSelection = computed(() =>
  items.value.filter((item) => selection.isSelected(item.id)).map((item) => item.id),
)

const currency = computed(
  () =>
    new Intl.NumberFormat(playgroundFormatLocale(locale.locale.value), {
      style: 'currency',
      currency: 'GBP',
    }),
)
const rowActions = computed<readonly RowAction[]>(() => [
  { key: 'view', label: locale.t('playground.common.view'), icon: mdiEyeOutline, priority: 0 },
  { key: 'edit', label: locale.t('playground.common.edit'), icon: mdiPencilOutline, priority: 1 },
  {
    key: 'delete',
    label: locale.t('playground.common.delete'),
    icon: mdiTrashCanOutline,
    intent: 'danger',
    priority: 2,
  },
])

function applyFilters(value: FilterValues): void {
  savedViews.markModified()
  queryState.setFilters(value)
}

function paginate(value: PaginationRequest): void {
  if (value.mode !== 'page') throw new TypeError('The demo source uses page pagination')
  savedViews.markModified()
  queryState.paginate(value)
}

function applySavedView(value: DataQuery<AccountFilters, AccountSortKey>): void {
  queryState.replace(value, { mode: 'push' })
}

function updateCurrentPageSelection(value: readonly unknown[]): void {
  const selected = new Set(value.filter((key): key is number => typeof key === 'number'))
  for (const item of items.value) selection.setSelected(item.id, selected.has(item.id))
}

async function refresh(): Promise<void> {
  if (loading.value) return
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 650))
  loading.value = false
  emit('message', locale.t('playground.data.refreshed'))
}

function exportCsv(): void {
  const documentText = createCsvDocument({
    columns: columnPreferences.visibleColumns.value,
    rows: filteredAccounts.value,
    formatValue: (value, _item, column) =>
      column.dataType === 'currency' && typeof value === 'number'
        ? currency.value.format(value)
        : value,
  })
  const url = URL.createObjectURL(new Blob([documentText], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'workspace-accounts.csv'
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  requestAnimationFrame(() => URL.revokeObjectURL(url))
  emit('message', locale.t('playground.data.exported', { count: filteredAccounts.value.length }))
}

function runAction(action: RowAction, account: DemoAccount): void {
  emit('message', `${action.label}: ${account.name}`)
}
</script>

<template>
  <div class="playground-data-workspace">
    <VaDataPage
      :columns="columnPreferences.visibleColumns.value"
      fill-height
      :items="items"
      :model-value="currentPageSelection"
      :pagination="paginationMeta"
      :refreshing="loading"
      show-select
      @paginate="paginate"
      @column-resize="columnPreferences.setWidth($event.key, $event.width)"
      @column-resize-reset="columnPreferences.resetWidth($event)"
      @update:model-value="updateCurrentPageSelection"
    >
      <template #filters>
        <VaFilterBar
          :fields="filterFields"
          immediate
          :model-value="filters"
          @apply="applyFilters"
        />
      </template>
      <template #toolbar>
        <VaSelectionBar
          class="playground-data-selection"
          :controller="selection"
          :total="filteredAccounts.length"
        />
        <VaSavedViewPicker
          :controller="savedViews"
          :state="queryState.query.value"
          @apply="applySavedView"
        />
        <VSwitch
          color="primary"
          hide-details
          :label="locale.t('playground.data.overflowStress')"
          :model-value="stressLayout"
          @update:model-value="stressLayout = Boolean($event)"
        />
        <VaButton
          appearance="outline"
          intent="neutral"
          :prepend-icon="mdiDownloadOutline"
          size="small"
          @click="exportCsv"
        >
          {{ locale.t('playground.common.exportCsv') }}
        </VaButton>
        <VaButton :loading="loading" :prepend-icon="mdiRefresh" size="small" @click="refresh">
          {{ locale.t('playground.common.refresh') }}
        </VaButton>
        <VaColumnManager :controller="columnPreferences" />
      </template>
      <template #[`item.name`]="{ item }">
        <div class="playground-identity-cell">
          <strong>{{ item.name }}</strong>
          <span>#{{ item.id }}</span>
        </div>
      </template>
      <template #[`item.actions`]="{ item }">
        <VaRowActions
          :actions="rowActions"
          :max-visible="1"
          more-icon="$menuMore"
          @action="runAction($event, item)"
        />
      </template>
    </VaDataPage>
  </div>
</template>
