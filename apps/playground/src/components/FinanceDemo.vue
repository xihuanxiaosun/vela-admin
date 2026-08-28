<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  mdiBankOutline,
  mdiCalendarClockOutline,
  mdiCashMultiple,
  mdiCreditCardOutline,
  mdiDownloadOutline,
  mdiEyeOutline,
  mdiHomeCityOutline,
  mdiRefresh,
  mdiWalletOutline,
} from '@mdi/js'
import type { PagePagination, PagePaginationMeta, PaginationRequest } from '@vela-admin/contracts'
import {
  VaDataPage,
  VaFilterBar,
  VaRowActions,
  createCsvDocument,
  type CurrencyColumnPresentation,
  type DataColumn,
  type FilterField,
  type FilterValues,
  type RowAction,
  type StatusColumnPresentation,
} from '@vela-admin/data'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton } from '@vela-admin/ui'

import { demoFinanceRecords, type DemoFinanceRecord } from '../demo/finance'
import { playgroundFormatLocale, translateDemoLabel } from '../demo/localization'

const emit = defineEmits<{
  message: [value: string]
}>()
const locale = useVelaLocale()

const loading = ref(false)
const filters = ref<FilterValues>({})
const pagination = ref<PagePagination>({ mode: 'page', page: 1, pageSize: 15 })

const filterFields = computed<readonly FilterField[]>(() => [
  {
    key: 'keyword',
    kind: 'text',
    label: locale.t('playground.finance.search'),
    placeholder: locale.t('playground.finance.searchPlaceholder'),
    pinned: true,
  },
  {
    key: 'status',
    kind: 'select',
    label: locale.t('playground.finance.settlementStatus'),
    pinned: true,
    options: [
      { title: locale.t('playground.finance.settled'), value: 'settled' },
      { title: locale.t('playground.finance.pending'), value: 'pending' },
      { title: locale.t('playground.finance.refunded'), value: 'refunded' },
    ],
  },
  {
    key: 'channel',
    kind: 'select',
    label: locale.t('playground.finance.paymentChannel'),
    options: [
      { title: locale.t('playground.finance.card'), value: 'card' },
      { title: locale.t('playground.finance.wallet'), value: 'wallet' },
      { title: locale.t('playground.finance.bank'), value: 'bank' },
    ],
  },
])

const statusPresentation = computed<StatusColumnPresentation>(() => ({
  kind: 'status',
  values: {
    settled: {
      label: locale.t('playground.finance.settled'),
      tone: 'success',
      icon: '$checkCircle',
    },
    pending: {
      label: locale.t('playground.finance.pending'),
      tone: 'warning',
      icon: '$helpCircle',
    },
    refunded: {
      label: locale.t('playground.finance.refunded'),
      tone: 'danger',
      icon: '$closeCircle',
    },
  },
}))

const channelPresentation = computed<StatusColumnPresentation>(() => ({
  kind: 'status',
  values: {
    card: {
      label: locale.t('playground.finance.card'),
      tone: 'info',
      icon: mdiCreditCardOutline,
    },
    wallet: {
      label: locale.t('playground.finance.wallet'),
      tone: 'primary',
      icon: mdiWalletOutline,
    },
    bank: {
      label: locale.t('playground.finance.bank'),
      tone: 'neutral',
      icon: mdiBankOutline,
    },
  },
}))

const moneyPresentation = computed<CurrencyColumnPresentation>(() => ({
  kind: 'currency',
  currency: 'GBP',
  locale: playgroundFormatLocale(locale.locale.value),
  icon: mdiCashMultiple,
  toneBySign: true,
}))

const columns = computed<readonly DataColumn<DemoFinanceRecord>[]>(() => [
  {
    key: 'reference',
    title: locale.t('playground.finance.transaction'),
    value: (item) => ({ primary: item.reference, secondary: `#${item.id}` }),
    presentation: { kind: 'identity' },
  },
  {
    key: 'service',
    title: locale.t('playground.finance.service'),
    value: (item) => ({
      primary: translateDemoLabel(locale.t, item.service),
      secondary: translateDemoLabel(locale.t, item.serviceGroup),
      icon: mdiHomeCityOutline,
    }),
    presentation: { kind: 'media', fallbackIcon: mdiHomeCityOutline },
  },
  { key: 'customer', title: locale.t('playground.finance.customer'), overflow: 'ellipsis' },
  {
    key: 'channel',
    title: locale.t('playground.finance.channel'),
    presentation: channelPresentation.value,
  },
  {
    key: 'gross',
    title: locale.t('playground.finance.gross'),
    presentation: moneyPresentation.value,
  },
  {
    key: 'fee',
    title: locale.t('playground.finance.fee'),
    presentation: { ...moneyPresentation.value, toneBySign: false, tone: 'neutral' },
  },
  {
    key: 'net',
    title: locale.t('playground.finance.net'),
    presentation: moneyPresentation.value,
  },
  {
    key: 'change',
    title: locale.t('playground.finance.periodMovement'),
    value: (item) => ({
      value: item.net,
      delta: item.change,
      secondary: locale.t('playground.finance.priorPeriod'),
    }),
    presentation: {
      kind: 'trend',
      locale: playgroundFormatLocale(locale.locale.value),
      notation: 'compact',
      currency: 'GBP',
      maximumFractionDigits: 1,
    },
  },
  {
    key: 'reconciliation',
    title: locale.t('playground.finance.reconciliation'),
    value: (item) => ({
      value: item.reconciliation,
      label: `${item.reconciliation}%`,
      secondary:
        item.status === 'pending'
          ? locale.t('playground.finance.awaitingProvider')
          : locale.t('playground.finance.complete'),
      tone: item.status === 'pending' ? 'warning' : 'success',
    }),
    presentation: { kind: 'progress', max: 100, showValue: false },
  },
  {
    key: 'status',
    title: locale.t('playground.common.status'),
    presentation: statusPresentation.value,
  },
  {
    key: 'paidAt',
    title: locale.t('playground.finance.paidAt'),
    presentation: {
      kind: 'datetime',
      locale: playgroundFormatLocale(locale.locale.value),
      dateStyle: 'medium',
      timeStyle: 'short',
      icon: mdiCalendarClockOutline,
    },
  },
  { key: 'actions', title: locale.t('playground.common.actions'), role: 'actions' },
])

const rowActions = computed<readonly RowAction[]>(() => [
  {
    key: 'view',
    label: locale.t('playground.common.viewDetails'),
    icon: mdiEyeOutline,
    intent: 'primary',
    priority: 0,
  },
  {
    key: 'reconcile',
    label: locale.t('playground.finance.reconcile'),
    icon: mdiBankOutline,
    priority: 1,
  },
])

const filteredRecords = computed(() => {
  const keyword = String(filters.value.keyword ?? '')
    .trim()
    .toLocaleLowerCase()
  return demoFinanceRecords.filter(
    (record) =>
      (!keyword ||
        `${record.reference} ${record.customer} ${record.service}`
          .toLocaleLowerCase()
          .includes(keyword)) &&
      (!filters.value.status || record.status === filters.value.status) &&
      (!filters.value.channel || record.channel === filters.value.channel),
  )
})

const items = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  return filteredRecords.value.slice(start, start + pagination.value.pageSize)
})

const paginationMeta = computed<PagePaginationMeta>(() => ({
  ...pagination.value,
  total: filteredRecords.value.length,
  pageCount: Math.max(1, Math.ceil(filteredRecords.value.length / pagination.value.pageSize)),
}))

function applyFilters(value: FilterValues): void {
  filters.value = value
  pagination.value = { ...pagination.value, page: 1 }
}

function paginate(value: PaginationRequest): void {
  if (value.mode !== 'page') throw new TypeError('The finance demo uses page pagination')
  pagination.value = value
}

async function refresh(): Promise<void> {
  if (loading.value) return
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 520))
  loading.value = false
  emit('message', locale.t('playground.finance.refreshed'))
}

function exportCsv(): void {
  const csv = createCsvDocument({ columns: columns.value, rows: filteredRecords.value })
  emit('message', locale.t('playground.finance.exported', { count: csv.split('\n').length - 1 }))
}

function runAction(action: RowAction, record: DemoFinanceRecord): void {
  emit('message', `${action.label}: ${record.reference}`)
}
</script>

<template>
  <div class="playground-data-workspace">
    <VaDataPage
      :columns="columns"
      fill-height
      :items="items"
      :pagination="paginationMeta"
      :refreshing="loading"
      @paginate="paginate"
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
        <VaButton
          appearance="outline"
          intent="neutral"
          :prepend-icon="mdiDownloadOutline"
          size="small"
          @click="exportCsv"
        >
          {{ locale.t('playground.common.export') }}
        </VaButton>
        <VaButton :loading="loading" :prepend-icon="mdiRefresh" size="small" @click="refresh">
          {{ locale.t('playground.common.refresh') }}
        </VaButton>
      </template>
      <template #[`item.actions`]="{ item }">
        <VaRowActions :actions="rowActions" @action="runAction($event, item)" />
      </template>
    </VaDataPage>
  </div>
</template>
