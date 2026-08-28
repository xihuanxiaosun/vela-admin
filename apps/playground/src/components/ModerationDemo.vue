<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  mdiAlertOutline,
  mdiCalendarClockOutline,
  mdiCheckDecagramOutline,
  mdiCommentTextOutline,
  mdiEyeOutline,
  mdiFileDocumentOutline,
  mdiFormatListText,
  mdiRefresh,
  mdiShieldSearch,
} from '@mdi/js'
import type { PagePagination, PagePaginationMeta, PaginationRequest } from '@vela-admin/contracts'
import {
  VaDataPage,
  VaFilterBar,
  VaRowActions,
  type DataColumn,
  type FilterField,
  type FilterValues,
  type RowAction,
  type StatusColumnPresentation,
} from '@vela-admin/data'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton } from '@vela-admin/ui'

import { demoModerationRecords, type DemoModerationRecord } from '../demo/moderation'
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
    label: locale.t('playground.moderation.search'),
    placeholder: locale.t('playground.moderation.searchPlaceholder'),
    pinned: true,
  },
  {
    key: 'status',
    kind: 'select',
    label: locale.t('playground.moderation.reviewStatus'),
    pinned: true,
    options: [
      { title: locale.t('playground.moderation.queued'), value: 'queued' },
      { title: locale.t('playground.moderation.reviewing'), value: 'reviewing' },
      { title: locale.t('playground.moderation.approved'), value: 'approved' },
      { title: locale.t('playground.moderation.rejected'), value: 'rejected' },
    ],
  },
  {
    key: 'contentType',
    kind: 'select',
    label: locale.t('playground.moderation.contentType'),
    options: [
      { title: locale.t('playground.moderation.listing'), value: 'listing' },
      { title: locale.t('playground.moderation.post'), value: 'post' },
      { title: locale.t('playground.moderation.comment'), value: 'comment' },
    ],
  },
  {
    key: 'automated',
    kind: 'boolean',
    label: locale.t('playground.moderation.automatedTriage'),
  },
])

const reviewStatus = computed<StatusColumnPresentation>(() => ({
  kind: 'status',
  values: {
    queued: {
      label: locale.t('playground.moderation.queued'),
      tone: 'warning',
      icon: '$helpCircle',
    },
    reviewing: {
      label: locale.t('playground.moderation.reviewing'),
      tone: 'info',
      icon: mdiShieldSearch,
    },
    approved: {
      label: locale.t('playground.moderation.approved'),
      tone: 'success',
      icon: '$checkCircle',
    },
    rejected: {
      label: locale.t('playground.moderation.rejected'),
      tone: 'danger',
      icon: '$closeCircle',
    },
  },
}))

function contentIcon(type: DemoModerationRecord['contentType']): string {
  if (type === 'listing') return mdiFormatListText
  if (type === 'comment') return mdiCommentTextOutline
  return mdiFileDocumentOutline
}

const columns = computed<readonly DataColumn<DemoModerationRecord>[]>(() => [
  {
    key: 'title',
    title: locale.t('playground.moderation.content'),
    value: (item) => ({
      primary: translateDemoLabel(locale.t, item.title),
      secondary: translateDemoLabel(locale.t, item.excerpt),
      icon: contentIcon(item.contentType),
    }),
    presentation: { kind: 'media' },
    overflow: 'ellipsis',
  },
  {
    key: 'author',
    title: locale.t('playground.moderation.author'),
    value: (item) => ({
      primary: item.author,
      secondary: translateDemoLabel(locale.t, item.authorRegion),
    }),
    presentation: { kind: 'identity' },
  },
  {
    key: 'automated',
    title: locale.t('playground.moderation.triage'),
    presentation: {
      kind: 'boolean',
      trueState: {
        label: locale.t('playground.moderation.automated'),
        tone: 'info',
        icon: mdiCheckDecagramOutline,
      },
      falseState: {
        label: locale.t('playground.moderation.manual'),
        tone: 'neutral',
        icon: mdiEyeOutline,
      },
    },
  },
  {
    key: 'riskScore',
    title: locale.t('playground.moderation.riskScore'),
    value: (item) => ({
      value: item.riskScore,
      label: `${item.riskScore}/100`,
      secondary: locale.t('playground.moderation.signals', { count: item.signalCount }),
      tone: item.riskScore >= 70 ? 'danger' : item.riskScore >= 40 ? 'warning' : 'success',
    }),
    presentation: { kind: 'progress', max: 100, showValue: false },
  },
  {
    key: 'reports',
    title: locale.t('playground.moderation.reports'),
    value: (item) => ({
      value: item.reports,
      delta: item.reportChange,
      secondary: locale.t('playground.moderation.previousPeriod'),
    }),
    presentation: {
      kind: 'trend',
      locale: playgroundFormatLocale(locale.locale.value),
      higherIsBetter: false,
    },
  },
  {
    key: 'status',
    title: locale.t('playground.common.status'),
    presentation: reviewStatus.value,
  },
  {
    key: 'submittedAt',
    title: locale.t('playground.moderation.submitted'),
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
    key: 'review',
    label: locale.t('playground.moderation.review'),
    icon: mdiShieldSearch,
    intent: 'primary',
    priority: 0,
  },
  {
    key: 'approve',
    label: locale.t('playground.moderation.approve'),
    icon: mdiCheckDecagramOutline,
    intent: 'success',
    priority: 1,
  },
  {
    key: 'escalate',
    label: locale.t('playground.moderation.escalate'),
    icon: mdiAlertOutline,
    intent: 'danger',
    priority: 2,
  },
])

const filteredRecords = computed(() => {
  const keyword = String(filters.value.keyword ?? '')
    .trim()
    .toLocaleLowerCase()
  return demoModerationRecords.filter(
    (record) =>
      (!keyword ||
        `${record.title} ${record.excerpt} ${record.author}`
          .toLocaleLowerCase()
          .includes(keyword)) &&
      (!filters.value.status || record.status === filters.value.status) &&
      (!filters.value.contentType || record.contentType === filters.value.contentType) &&
      (filters.value.automated === undefined || record.automated === filters.value.automated),
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
  if (value.mode !== 'page') throw new TypeError('The moderation demo uses page pagination')
  pagination.value = value
}

async function refresh(): Promise<void> {
  if (loading.value) return
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 520))
  loading.value = false
  emit('message', locale.t('playground.moderation.refreshed'))
}

function runAction(action: RowAction, record: DemoModerationRecord): void {
  emit('message', `${action.label}: ${translateDemoLabel(locale.t, record.title)}`)
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
