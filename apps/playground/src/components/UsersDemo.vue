<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiEyeOutline, mdiPencilOutline, mdiRefresh } from '@mdi/js'
import type { PagePagination, PagePaginationMeta, PaginationRequest } from '@vela-admin/contracts'
import {
  VaDataPage,
  VaFilterBar,
  VaRowActions,
  type DataColumn,
  type FilterField,
  type FilterValues,
  type RowAction,
} from '@vela-admin/data'
import {
  createFormDataMapper,
  createRuleValidationAdapter,
  email,
  required,
  useFormWorkflow,
  VaFormDialog,
  type FormSchema,
} from '@vela-admin/forms'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, useFeedback } from '@vela-admin/ui'

import { demoAccounts, type DemoAccount } from '../demo/data'
import type { DemoImageValue } from '../demo/image-upload'
import { localizedOption, translateDemoLabel } from '../demo/localization'
import { createDemoTablePresentations } from '../demo/table-presentations'
import AvatarUploadField from './AvatarUploadField.vue'

const emit = defineEmits<{
  message: [value: string]
}>()

interface UserEditorValues {
  [key: string]: unknown
  name: string
  email: string
  role: string
  team: string
  status: DemoAccount['status']
  notifications: boolean
  avatar: DemoImageValue | null
}

interface UserUpdatePayload {
  display_name: string
  email_address: string
  access: {
    role: string
    team: string
    status: DemoAccount['status']
  }
  notifications: boolean
  avatar_url: string | null
}

interface UserUpdateResult {
  id: number
  payload: UserUpdatePayload
}

const feedback = useFeedback()
const locale = useVelaLocale()
const presentations = computed(() => createDemoTablePresentations(locale.t, locale.locale.value))
const accounts = ref<DemoAccount[]>(demoAccounts.slice(0, 36))
const filters = ref<FilterValues>({})
const loading = ref(false)
const editorOpen = ref(false)
const pagination = ref<PagePagination>({ mode: 'page', page: 1, pageSize: 15 })

const filterFields = computed<readonly FilterField[]>(() => [
  {
    key: 'keyword',
    kind: 'text',
    label: locale.t('playground.users.search'),
    placeholder: locale.t('playground.users.searchPlaceholder'),
    pinned: true,
  },
  {
    key: 'status',
    kind: 'select',
    label: locale.t('playground.users.accountStatus'),
    pinned: true,
    options: [
      localizedOption(locale.t, 'active'),
      localizedOption(locale.t, 'invited'),
      localizedOption(locale.t, 'suspended'),
    ],
  },
  {
    key: 'role',
    kind: 'select',
    label: locale.t('playground.common.role'),
    options: [
      localizedOption(locale.t, 'Owner'),
      localizedOption(locale.t, 'Administrator'),
      localizedOption(locale.t, 'Analyst'),
      localizedOption(locale.t, 'Editor'),
    ],
  },
])

const columns = computed<readonly DataColumn<DemoAccount>[]>(() => [
  {
    key: 'name',
    title: locale.t('playground.common.user'),
    role: 'identity',
    sizing: { mode: 'fill', min: 220, max: 320 },
    overflow: 'ellipsis',
    value: (item) => ({
      primary: item.name,
      secondary: `#${item.id} · ${translateDemoLabel(locale.t, item.region)}`,
      ...(item.avatarUrl ? { image: item.avatarUrl } : {}),
    }),
    presentation: { kind: 'identity' },
  },
  {
    key: 'email',
    title: locale.t('playground.common.email'),
    sizing: { mode: 'content', min: 200, max: 280 },
    overflow: 'ellipsis',
  },
  {
    key: 'role',
    title: locale.t('playground.common.role'),
    value: (item) => translateDemoLabel(locale.t, item.role),
    sizing: { mode: 'content', min: 128, max: 176 },
  },
  {
    key: 'team',
    title: locale.t('playground.common.team'),
    value: (item) => translateDemoLabel(locale.t, item.team),
    sizing: { mode: 'content', min: 120, max: 164 },
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
    title: locale.t('playground.common.lastActive'),
    dataType: 'datetime',
    presentation: presentations.value.standardDateTime,
  },
  { key: 'actions', title: locale.t('playground.common.actions'), role: 'actions' },
])

const rowActions = computed<readonly RowAction[]>(() => [
  {
    key: 'edit',
    label: locale.t('playground.common.edit'),
    icon: mdiPencilOutline,
    intent: 'primary',
    priority: 0,
  },
  {
    key: 'view',
    label: locale.t('playground.users.viewProfile'),
    icon: mdiEyeOutline,
    priority: 1,
  },
])

const editorSchema = computed<FormSchema<UserEditorValues>>(() => ({
  sections: [
    {
      key: 'identity',
      title: locale.t('playground.users.section.identity'),
      description: locale.t('playground.users.section.identityDescription'),
      fields: [
        {
          key: 'avatar',
          kind: 'custom',
          renderer: 'avatar-upload',
          label: locale.t('playground.users.profileImage'),
        },
        {
          key: 'name',
          kind: 'text',
          label: locale.t('playground.users.displayName'),
          required: true,
          layout: { md: 6 },
        },
        {
          key: 'email',
          kind: 'email',
          label: locale.t('playground.users.accountEmail'),
          required: true,
          layout: { md: 6 },
        },
      ],
    },
    {
      key: 'access',
      title: locale.t('playground.users.section.access'),
      description: locale.t('playground.users.section.accessDescription'),
      fields: [
        {
          key: 'role',
          kind: 'select',
          label: locale.t('playground.common.role'),
          options: ['Owner', 'Administrator', 'Analyst', 'Editor'].map((value) => ({
            title: translateDemoLabel(locale.t, value),
            value,
          })),
          layout: { md: 6 },
        },
        {
          key: 'team',
          kind: 'select',
          label: locale.t('playground.common.team'),
          options: ['Operations', 'Growth', 'Finance', 'Content'].map((value) => ({
            title: translateDemoLabel(locale.t, value),
            value,
          })),
          layout: { md: 6 },
        },
        {
          key: 'status',
          kind: 'radio',
          label: locale.t('playground.users.accountStatus'),
          options: [
            localizedOption(locale.t, 'active'),
            localizedOption(locale.t, 'invited'),
            localizedOption(locale.t, 'suspended'),
          ],
        },
        {
          key: 'notifications',
          kind: 'switch',
          label: locale.t('playground.users.notifications'),
        },
      ],
    },
  ],
}))

const userMapper = createFormDataMapper<UserEditorValues, DemoAccount, UserUpdatePayload>({
  createValues: () => ({
    name: '',
    email: '',
    role: 'Analyst',
    team: 'Operations',
    status: 'active',
    notifications: true,
    avatar: null,
  }),
  createPayload: () => ({
    display_name: '',
    email_address: '',
    access: { role: '', team: '', status: 'active' },
    notifications: true,
    avatar_url: null,
  }),
  fields: [
    { valuePath: 'name', recordPath: 'name', submitPath: 'display_name' },
    { valuePath: 'email', recordPath: 'email', submitPath: 'email_address' },
    { valuePath: 'role', recordPath: 'role', submitPath: 'access.role' },
    { valuePath: 'team', recordPath: 'team', submitPath: 'access.team' },
    { valuePath: 'status', recordPath: 'status', submitPath: 'access.status' },
    {
      valuePath: 'notifications',
      recordPath: 'notifications',
      submitPath: 'notifications',
      deserialize: (value) => value ?? true,
    },
    {
      valuePath: 'avatar',
      recordPath: 'avatarUrl',
      submitPath: 'avatar_url',
      deserialize: (value) =>
        typeof value === 'string' && value ? ({ url: value } satisfies DemoImageValue) : null,
      serialize: (value) =>
        value && typeof value === 'object' && 'url' in value ? String(value.url) : null,
    },
  ],
})

function waitForDemoRequest(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, 500)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout)
        reject(new DOMException('Cancelled', 'AbortError'))
      },
      { once: true },
    )
  })
}

const editor = useFormWorkflow<
  UserEditorValues,
  DemoAccount,
  UserUpdatePayload,
  UserUpdateResult,
  number
>({
  initialValues: {
    name: '',
    email: '',
    role: 'Analyst',
    team: 'Operations',
    status: 'active',
    notifications: true,
    avatar: null,
  },
  validation: createRuleValidationAdapter({
    fields: {
      name: [required()],
      email: [required(), email()],
    },
  }),
  adapter: {
    async load({ key, signal }) {
      await waitForDemoRequest(signal)
      const account = accounts.value.find((candidate) => candidate.id === key)
      if (!account) {
        throw Object.assign(new Error(locale.t('playground.users.notFound')), {
          kind: 'not-found',
          retryable: false,
        })
      }
      return account
    },
    toValues: userMapper.fromRecord,
    toPayload: (values) => userMapper.toPayload(values),
    async submit(payload, { key, signal }) {
      await waitForDemoRequest(signal)
      if (key === undefined) throw new Error(locale.t('playground.users.idRequired'))
      return { id: key, payload: { ...payload, access: { ...payload.access } } }
    },
  },
})

const filteredAccounts = computed(() => {
  const keyword = String(filters.value.keyword ?? '')
    .trim()
    .toLocaleLowerCase()
  return accounts.value.filter(
    (account) =>
      (!keyword || `${account.name} ${account.email}`.toLocaleLowerCase().includes(keyword)) &&
      (!filters.value.status || account.status === filters.value.status) &&
      (!filters.value.role || account.role === filters.value.role),
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

function applyFilters(value: FilterValues): void {
  filters.value = value
  pagination.value = { ...pagination.value, page: 1 }
}

function paginate(value: PaginationRequest): void {
  if (value.mode !== 'page') throw new TypeError('The user demo uses page pagination')
  pagination.value = value
}

function openEditor(account: DemoAccount): void {
  editorOpen.value = true
  void editor.beginEdit(account.id)
}

function runAction(action: RowAction, account: DemoAccount): void {
  if (action.key === 'edit') {
    openEditor(account)
    return
  }
  emit('message', locale.t('playground.users.opened', { name: account.name }))
}

function applyEditorResult(result: UserUpdateResult): void {
  const values = editor.form.values.value
  accounts.value = accounts.value.map((account) =>
    account.id === result.id
      ? {
          ...account,
          name: values.name,
          email: values.email,
          role: values.role,
          team: values.team,
          status: values.status,
          ...(values.avatar?.url ? { avatarUrl: values.avatar.url } : {}),
        }
      : account,
  )
  emit('message', locale.t('playground.users.updated', { name: values.name }))
}

async function canCloseEditor(): Promise<boolean> {
  if (!editor.form.dirty.value) return true
  return feedback.confirm({
    title: locale.t('playground.users.discardTitle'),
    message: locale.t('playground.users.discardMessage'),
    confirmText: locale.t('playground.users.discardConfirm'),
    intent: 'danger',
  })
}

function avatarValue(value: unknown): DemoImageValue | null {
  return value && typeof value === 'object' && 'url' in value ? { url: String(value.url) } : null
}

async function refresh(): Promise<void> {
  if (loading.value) return
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 600))
  loading.value = false
  emit('message', locale.t('playground.users.refreshed'))
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
        <VaRowActions :actions="rowActions" :max-visible="2" @action="runAction($event, item)" />
      </template>
    </VaDataPage>

    <VaFormDialog
      v-model="editorOpen"
      :before-close="canCloseEditor"
      :controller="editor"
      :description="locale.t('playground.users.editDescription')"
      :schema="editorSchema"
      :title="locale.t('playground.users.editTitle')"
      width="760"
      @submitted="applyEditorResult"
    >
      <template #field-avatar="{ value, update, disabled, errorMessages }">
        <AvatarUploadField
          :disabled="disabled"
          :error-messages="errorMessages"
          :model-value="avatarValue(value)"
          :name="String(editor.form.values.value.name ?? '')"
          @update:model-value="update"
        />
      </template>
    </VaFormDialog>
  </div>
</template>
