<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiDownloadOutline, mdiEyeOutline, mdiPencilOutline, mdiRefresh } from '@mdi/js'
import { createWebStorageAdapter } from '@vela-admin/adapters'
import type { PagePagination, PagePaginationMeta, PaginationRequest } from '@vela-admin/contracts'
import {
  VaColumnManager,
  VaDataPage,
  VaFilterBar,
  VaRowActions,
  VaSelectionBar,
  createCsvDocument,
  useColumnPreferences,
  useCrossPageSelection,
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
const localeController = useVelaLocale()
const presentations = computed(() =>
  createDemoTablePresentations(localeController.t, localeController.locale.value),
)

interface WideAccount extends DemoAccount {
  readonly organization: string
  readonly plan: 'Enterprise' | 'Scale' | 'Starter'
  readonly locale: string
  readonly device: string
  readonly lastIp: string
  readonly monthlyRevenue: number
  readonly tickets: number
  readonly risk: 'low' | 'medium' | 'high'
}

const organizations = ['Northstar Labs', 'Monarch Studio', 'Atlas Retail', 'Harbour Works'] as const
const plans: readonly WideAccount['plan'][] = ['Enterprise', 'Scale', 'Starter']
const locales = ['en-GB', 'en-US', 'fr-FR', 'es-ES'] as const
const devices = ['Chrome · macOS', 'Safari · iOS', 'Edge · Windows', 'Chrome · Android'] as const
const risks: readonly WideAccount['risk'][] = ['low', 'low', 'medium', 'high']

const wideAccounts: readonly WideAccount[] = Array.from({ length: 1_280 }, (_, index) => {
  const base = demoAccounts[index % demoAccounts.length] ?? demoAccounts[0]
  if (!base) throw new Error(localeController.t('playground.wide.sourceMissing'))
  const id = index + 1
  return {
    ...base,
    id,
    name: `${base.name} ${Math.floor(index / demoAccounts.length) + 1}`,
    email: `member.${id}@example.dev`,
    organization: organizations[index % organizations.length] ?? organizations[0],
    plan: plans[index % plans.length] ?? 'Starter',
    locale: locales[index % locales.length] ?? 'en-GB',
    device: devices[index % devices.length] ?? 'Chrome · macOS',
    lastIp: `185.24.${Math.floor(index / 240) % 255}.${(index % 240) + 1}`,
    monthlyRevenue: 420 + index * 13.75,
    tickets: index % 12,
    risk: risks[index % risks.length] ?? 'low',
  }
})

const loading = ref(false)
const filters = ref<FilterValues>({})
const pagination = ref<PagePagination>({ mode: 'page', page: 1, pageSize: 25 })
const selection = useCrossPageSelection<number>({ scope: filters })
const currency = computed(
  () =>
    new Intl.NumberFormat(playgroundFormatLocale(localeController.locale.value), {
      style: 'currency',
      currency: 'GBP',
    }),
)

const filterFields = computed<readonly FilterField[]>(() => [
  {
    key: 'keyword',
    kind: 'text',
    label: localeController.t('playground.wide.search'),
    placeholder: localeController.t('playground.wide.searchPlaceholder'),
    pinned: true,
  },
  {
    key: 'plan',
    kind: 'select',
    label: localeController.t('playground.wide.plan'),
    pinned: true,
    options: plans.map((value) => localizedOption(localeController.t, value)),
  },
  {
    key: 'status',
    kind: 'select',
    label: localeController.t('playground.common.status'),
    options: [
      localizedOption(localeController.t, 'active'),
      localizedOption(localeController.t, 'invited'),
      localizedOption(localeController.t, 'suspended'),
    ],
  },
  {
    key: 'minimumRevenue',
    kind: 'number',
    label: localeController.t('playground.wide.minimumRevenue'),
    min: 0,
  },
])

const columns = computed<readonly DataColumn<WideAccount>[]>(() => [
  {
    key: 'name',
    title: localeController.t('playground.common.account'),
    role: 'identity',
    sizing: { mode: 'fill', min: 220, max: 320 },
    overflow: 'ellipsis',
    value: (item) => ({
      primary: item.name,
      secondary: `#${item.id} · ${translateDemoLabel(localeController.t, item.region)}`,
      ...(item.avatarUrl ? { image: item.avatarUrl } : {}),
    }),
    presentation: { kind: 'identity' },
  },
  {
    key: 'email',
    title: localeController.t('playground.common.email'),
    sizing: { mode: 'content', min: 210, max: 260 },
  },
  {
    key: 'organization',
    title: localeController.t('playground.wide.organization'),
    sizing: { mode: 'content', min: 180, max: 220 },
  },
  {
    key: 'role',
    title: localeController.t('playground.common.role'),
    value: (item) => translateDemoLabel(localeController.t, item.role),
    sizing: { mode: 'content', min: 128, max: 176 },
  },
  {
    key: 'team',
    title: localeController.t('playground.common.team'),
    value: (item) => translateDemoLabel(localeController.t, item.team),
    sizing: { mode: 'content', min: 120, max: 160 },
  },
  {
    key: 'status',
    title: localeController.t('playground.common.status'),
    role: 'status',
    dataType: 'status',
    presentation: presentations.value.accountStatus,
  },
  {
    key: 'plan',
    title: localeController.t('playground.wide.plan'),
    sizing: { mode: 'content', min: 112, max: 144 },
    presentation: presentations.value.plan,
  },
  {
    key: 'region',
    title: localeController.t('playground.common.region'),
    value: (item) => translateDemoLabel(localeController.t, item.region),
    sizing: { mode: 'content', min: 128, max: 176 },
  },
  {
    key: 'locale',
    title: localeController.t('playground.wide.locale'),
    sizing: { mode: 'content', min: 96, max: 120 },
  },
  {
    key: 'device',
    title: localeController.t('playground.wide.lastDevice'),
    sizing: { mode: 'content', min: 176, max: 220 },
  },
  {
    key: 'lastIp',
    title: localeController.t('playground.wide.lastIp'),
    sizing: { mode: 'content', min: 132, max: 164 },
  },
  {
    key: 'signIns',
    title: localeController.t('playground.common.signIns'),
    dataType: 'number',
    presentation: presentations.value.signIn,
  },
  {
    key: 'monthlyRevenue',
    title: localeController.t('playground.wide.monthlyRevenue'),
    dataType: 'currency',
    presentation: presentations.value.sterling,
  },
  {
    key: 'tickets',
    title: localeController.t('playground.wide.openTickets'),
    dataType: 'number',
    presentation: presentations.value.ticket,
  },
  {
    key: 'risk',
    title: localeController.t('playground.wide.risk'),
    role: 'status',
    dataType: 'status',
    presentation: presentations.value.risk,
  },
  {
    key: 'createdAt',
    title: localeController.t('playground.common.created'),
    dataType: 'date',
    presentation: presentations.value.standardDate,
  },
  {
    key: 'lastSeenAt',
    title: localeController.t('playground.common.lastActive'),
    dataType: 'datetime',
    presentation: presentations.value.standardDateTime,
  },
  {
    key: 'note',
    title: localeController.t('playground.wide.internalNote'),
    value: (item) => translateDemoLabel(localeController.t, item.note),
    sizing: { mode: 'content', min: 220, max: 340 },
    overflow: 'ellipsis',
  },
  { key: 'actions', title: localeController.t('playground.common.actions'), role: 'actions' },
])

const columnPreferences = useColumnPreferences({
  columns,
  storageKey: 'wide-data-demo.columns',
  ...(typeof window === 'undefined'
    ? {}
    : {
        storage: createWebStorageAdapter(window.localStorage, {
          namespace: 'vela-playground',
        }),
      }),
})

const rowActions = computed<readonly RowAction[]>(() => [
  {
    key: 'view',
    label: localeController.t('playground.common.view'),
    icon: mdiEyeOutline,
    priority: 0,
  },
  {
    key: 'edit',
    label: localeController.t('playground.common.edit'),
    icon: mdiPencilOutline,
    intent: 'primary',
    priority: 1,
  },
])

const filteredAccounts = computed(() => {
  const keyword = String(filters.value.keyword ?? '')
    .trim()
    .toLocaleLowerCase()
  const minimumRevenue = Number(filters.value.minimumRevenue ?? 0)
  return wideAccounts.filter(
    (account) =>
      (!keyword ||
        `${account.name} ${account.email} ${account.organization}`
          .toLocaleLowerCase()
          .includes(keyword)) &&
      (!filters.value.plan || account.plan === filters.value.plan) &&
      (!filters.value.status || account.status === filters.value.status) &&
      account.monthlyRevenue >= minimumRevenue,
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

function applyFilters(value: FilterValues): void {
  filters.value = value
  pagination.value = { ...pagination.value, page: 1 }
}

function paginate(value: PaginationRequest): void {
  if (value.mode !== 'page') throw new TypeError('The wide table demo uses page pagination')
  pagination.value = value
}

function updateCurrentPageSelection(value: readonly unknown[]): void {
  const selected = new Set(value.filter((key): key is number => typeof key === 'number'))
  for (const item of items.value) selection.setSelected(item.id, selected.has(item.id))
}

function runAction(action: RowAction, account: WideAccount): void {
  emit('message', `${action.label}: ${account.name}`)
}

async function refresh(): Promise<void> {
  if (loading.value) return
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 650))
  loading.value = false
  emit('message', localeController.t('playground.wide.refreshed'))
}

function exportCsv(): void {
  const csv = createCsvDocument({
    columns: columnPreferences.visibleColumns.value,
    rows: filteredAccounts.value,
    formatValue: (value, _item, column) =>
      column.dataType === 'currency' && typeof value === 'number'
        ? currency.value.format(value)
        : value,
  })
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'wide-account-export.csv'
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  requestAnimationFrame(() => URL.revokeObjectURL(url))
  emit(
    'message',
    localeController.t('playground.wide.exported', { count: filteredAccounts.value.length }),
  )
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
      @column-resize="columnPreferences.setWidth($event.key, $event.width)"
      @column-resize-reset="columnPreferences.resetWidth($event)"
      @paginate="paginate"
      @update:model-value="updateCurrentPageSelection"
    >
      <template #filters>
        <VaFilterBar
          :fields="filterFields"
          immediate
          :model-value="filters"
          @apply="applyFilters"
          @reset="applyFilters({})"
          @update:model-value="filters = $event"
        />
      </template>
      <template #toolbar>
        <VaSelectionBar
          class="playground-data-selection"
          :controller="selection"
          :total="filteredAccounts.length"
        />
        <VaButton
          appearance="outline"
          intent="neutral"
          :prepend-icon="mdiDownloadOutline"
          size="small"
          @click="exportCsv"
        >
          {{ localeController.t('playground.common.exportCsv') }}
        </VaButton>
        <VaButton :loading="loading" :prepend-icon="mdiRefresh" size="small" @click="refresh">
          {{ localeController.t('playground.common.refresh') }}
        </VaButton>
        <VaColumnManager :controller="columnPreferences" />
      </template>
      <template #[`item.actions`]="{ item }">
        <VaRowActions :actions="rowActions" :max-visible="2" @action="runAction($event, item)" />
      </template>
    </VaDataPage>
  </div>
</template>
