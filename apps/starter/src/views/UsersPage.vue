<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VelaAccessBoundary, useVelaAccess } from '@vela-admin/access'
import { TransportFailure } from '@vela-admin/adapters'
import type {
  DataSource,
  NormalizedError,
  PagePagination,
  PagePaginationMeta,
  PaginationRequest,
} from '@vela-admin/contracts'
import {
  useDataPage,
  VaDataPage,
  VaFilterBar,
  VaRowActions,
  type DataColumn,
  type FilterField,
  type FilterValues,
  type RowAction,
  type StatusColumnPresentation,
} from '@vela-admin/data'
import {
  createRuleValidationAdapter,
  createValidationRules,
  useFormWorkflow,
  VaFormDialog,
  type FormSchema,
  type FormValidationAdapter,
} from '@vela-admin/forms'
import { useVelaLocale } from '@vela-admin/locale'
import { VaPageHeader } from '@vela-admin/shell'
import { VaButton, useFeedback } from '@vela-admin/ui'

import { useStarterCapabilities, type StarterIdentity } from '../access'
import { starterCapabilities, type StarterCapability } from '../access-policy'
import { starterUserRepository } from '../data/user-services'
import {
  starterUserRoles,
  starterUserStatuses,
  starterUserTeams,
  type StarterUserFilters,
  type StarterUserInput,
  type StarterUserRecord,
  type StarterUserRole,
  type StarterUserStatus,
  type StarterUserTeam,
} from '../data/users'

interface UserFormValues extends Record<string, unknown> {
  name: string
  email: string
  role: StarterUserRole
  team: StarterUserTeam
  status: StarterUserStatus
}

const locale = useVelaLocale()
const feedback = useFeedback()
const access = useVelaAccess<StarterIdentity>()
const repository = starterUserRepository
const capabilityState = useStarterCapabilities([
  starterCapabilities.usersCreate,
  starterCapabilities.usersUpdate,
  starterCapabilities.usersDelete,
])
const canUpdate = computed(() => capabilityState.can(starterCapabilities.usersUpdate))
const canDelete = computed(() => capabilityState.can(starterCapabilities.usersDelete))
const filters = ref<StarterUserFilters>({})
const pagination = ref<PagePagination>({ mode: 'page', page: 1, pageSize: 8 })
const editorOpen = ref(false)
const deletingId = ref<number>()

const query = computed(() => ({
  filters: filters.value,
  pagination: pagination.value,
  sort: [],
}))

const source: DataSource<StarterUserRecord, StarterUserFilters, string, PagePaginationMeta> = {
  load(dataQuery, context) {
    if (dataQuery.pagination.mode !== 'page') {
      throw new TypeError('The Starter user repository uses page pagination.')
    }
    return repository.list(
      { filters: dataQuery.filters, pagination: dataQuery.pagination },
      context.signal,
    )
  },
}

function normalizeError(error: unknown): NormalizedError {
  const candidate =
    error instanceof TransportFailure
      ? error.normalized
      : ((error as { normalized?: Partial<NormalizedError> }).normalized ??
        (error as Partial<NormalizedError>))
  if (
    typeof candidate.kind === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.retryable === 'boolean'
  ) {
    const normalized = candidate as NormalizedError
    const message =
      normalized.kind === 'forbidden'
        ? locale.t('starter.users.forbidden')
        : normalized.kind === 'unauthorized'
          ? locale.t('starter.users.unauthorized')
          : normalized.kind === 'not-found'
            ? locale.t('starter.users.notFound')
            : normalized.kind === 'conflict'
              ? locale.t('starter.users.emailConflict')
              : normalized.message
    return { ...normalized, message }
  }

  return {
    kind: 'unknown',
    message: error instanceof Error ? error.message : locale.t('starter.users.actionFailed'),
    retryable: true,
    cause: error,
  }
}

const userPage = useDataPage({ source, query, normalizeError })
const { data, items, loading, refreshing, error, execute, refresh } = userPage

const filterModel = computed<FilterValues>(() => ({
  ...(filters.value.keyword === undefined ? {} : { keyword: filters.value.keyword }),
  ...(filters.value.status === undefined ? {} : { status: filters.value.status }),
  ...(filters.value.role === undefined ? {} : { role: filters.value.role }),
  ...(filters.value.team === undefined ? {} : { team: filters.value.team }),
}))
const filterFields = computed<readonly FilterField[]>(() => [
  {
    key: 'keyword',
    kind: 'text',
    label: locale.t('starter.users.search'),
    placeholder: locale.t('starter.users.searchPlaceholder'),
    pinned: true,
  },
  {
    key: 'status',
    kind: 'select',
    label: locale.t('starter.users.status'),
    pinned: true,
    options: starterUserStatuses.map((value) => ({
      title: statusLabel(value),
      value,
    })),
  },
  {
    key: 'role',
    kind: 'select',
    label: locale.t('starter.users.role'),
    options: starterUserRoles.map((value) => ({
      title: roleLabel(value),
      value,
    })),
  },
  {
    key: 'team',
    kind: 'select',
    label: locale.t('starter.users.team'),
    options: starterUserTeams.map((value) => ({
      title: teamLabel(value),
      value,
    })),
  },
])

function statusLabel(value: StarterUserStatus): string {
  return locale.t(`starter.users.status.${value}`)
}

function roleLabel(value: StarterUserRole): string {
  return locale.t(`starter.users.role.${value}`)
}

function teamLabel(value: StarterUserTeam): string {
  return locale.t(`starter.users.team.${value}`)
}

function statusPresentation(): StatusColumnPresentation {
  return {
    kind: 'status',
    dot: true,
    values: {
      active: { label: statusLabel('active'), tone: 'success' },
      invited: { label: statusLabel('invited'), tone: 'info' },
      suspended: { label: statusLabel('suspended'), tone: 'danger' },
    },
  }
}

const columns = computed<readonly DataColumn<StarterUserRecord>[]>(() => {
  const resolved: DataColumn<StarterUserRecord>[] = [
    {
      key: 'name',
      title: locale.t('starter.users.user'),
      role: 'identity',
      sizing: { mode: 'fill', min: 220, max: 320 },
      overflow: 'ellipsis',
      value: (user) => ({
        primary: user.name,
        secondary: `${roleLabel(user.role)} · ${teamLabel(user.team)}`,
        icon: '$account',
      }),
      presentation: { kind: 'identity' },
    },
    {
      key: 'email',
      title: locale.t('starter.users.email'),
      sizing: { mode: 'content', min: 220, max: 300 },
      overflow: 'ellipsis',
    },
    {
      key: 'status',
      title: locale.t('starter.users.status'),
      role: 'status',
      dataType: 'status',
      value: (user) => user.status,
      presentation: statusPresentation(),
      sizing: { mode: 'content', min: 132, max: 168 },
    },
    {
      key: 'lastActiveAt',
      title: locale.t('starter.users.lastActive'),
      dataType: 'datetime',
      presentation: { kind: 'datetime', relative: true },
      sizing: { mode: 'content', min: 160, max: 220 },
    },
    {
      key: 'signIns',
      title: locale.t('starter.users.signIns'),
      dataType: 'number',
      presentation: { kind: 'number', locale: locale.locale.value },
      align: 'end',
      headerAlign: 'end',
      sizing: { mode: 'content', min: 112, max: 140 },
    },
  ]
  if (canUpdate.value || canDelete.value) {
    resolved.push({
      key: 'actions',
      title: locale.t('starter.users.actions'),
      role: 'actions',
      pin: 'auto-end',
      configurable: false,
      sizing: { mode: 'fixed', size: 148 },
    })
  }
  return resolved
})

const emptyPagination = computed<PagePaginationMeta>(() => ({
  mode: 'page',
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  total: 0,
  pageCount: 1,
}))
const paginationMeta = computed<PagePaginationMeta>(
  () => data.value?.pagination ?? emptyPagination.value,
)

watch(
  () => paginationMeta.value.page,
  (page) => {
    if (page !== pagination.value.page) pagination.value = { ...pagination.value, page }
  },
)

function validStatus(value: unknown): value is StarterUserStatus {
  return typeof value === 'string' && starterUserStatuses.includes(value as StarterUserStatus)
}

function validRole(value: unknown): value is StarterUserRole {
  return typeof value === 'string' && starterUserRoles.includes(value as StarterUserRole)
}

function validTeam(value: unknown): value is StarterUserTeam {
  return typeof value === 'string' && starterUserTeams.includes(value as StarterUserTeam)
}

function applyFilters(value: FilterValues): void {
  const next = {
    ...(typeof value.keyword === 'string' && value.keyword.trim()
      ? { keyword: value.keyword }
      : {}),
    ...(validStatus(value.status) ? { status: value.status } : {}),
    ...(validRole(value.role) ? { role: value.role } : {}),
    ...(validTeam(value.team) ? { team: value.team } : {}),
  } satisfies StarterUserFilters
  filters.value = next
  pagination.value = { ...pagination.value, page: 1 }
}

function paginate(value: PaginationRequest): void {
  if (value.mode === 'page') pagination.value = value
}

function createUserValues(): UserFormValues {
  return {
    name: '',
    email: '',
    role: 'analyst',
    team: 'operations',
    status: 'active',
  }
}

function toFormValues(record: StarterUserRecord): UserFormValues {
  return {
    name: record.name,
    email: record.email,
    role: record.role,
    team: record.team,
    status: record.status,
  }
}

function toInput(values: UserFormValues): StarterUserInput {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLocaleLowerCase(),
    role: values.role,
    team: values.team,
    status: values.status,
  }
}

const editorSchema = computed<FormSchema<UserFormValues>>(() => ({
  sections: [
    {
      key: 'identity',
      title: locale.t('starter.users.identitySection'),
      description: locale.t('starter.users.identityDescription'),
      fields: [
        {
          key: 'name',
          kind: 'text',
          label: locale.t('starter.users.displayName'),
          placeholder: locale.t('starter.users.displayName'),
          required: true,
          layout: { md: 6 },
          props: { autocomplete: 'name' },
        },
        {
          key: 'email',
          kind: 'email',
          label: locale.t('starter.users.emailAddress'),
          placeholder: 'name@example.dev',
          required: true,
          layout: { md: 6 },
          props: { autocomplete: 'email' },
        },
      ],
    },
    {
      key: 'access',
      title: locale.t('starter.users.accessSection'),
      description: locale.t('starter.users.accessDescription'),
      fields: [
        {
          key: 'role',
          kind: 'select',
          label: locale.t('starter.users.formRole'),
          options: starterUserRoles.map((value) => ({ title: roleLabel(value), value })),
          clearable: false,
          layout: { md: 6 },
        },
        {
          key: 'team',
          kind: 'select',
          label: locale.t('starter.users.formTeam'),
          options: starterUserTeams.map((value) => ({ title: teamLabel(value), value })),
          clearable: false,
          layout: { md: 6 },
        },
        {
          key: 'status',
          kind: 'radio',
          label: locale.t('starter.users.formStatus'),
          options: starterUserStatuses.map((value) => ({ title: statusLabel(value), value })),
        },
      ],
    },
  ],
}))

const editorValidation: FormValidationAdapter<UserFormValues> = {
  validate(values, signal) {
    const rules = createValidationRules(locale)
    return createRuleValidationAdapter<UserFormValues>({
      fields: {
        name: [rules.required(locale.t('starter.users.validation.name'))],
        email: [
          rules.required(locale.t('starter.users.validation.emailRequired')),
          rules.email(locale.t('starter.users.validation.email')),
        ],
      },
    }).validate(values, signal)
  },
}

const editor = useFormWorkflow<
  UserFormValues,
  StarterUserRecord,
  StarterUserInput,
  StarterUserRecord,
  number
>({
  initialValues: createUserValues(),
  validation: editorValidation,
  adapter: {
    load: ({ key, signal }) => repository.get(key, signal),
    toValues: toFormValues,
    toPayload: (values) => toInput(values),
    submit: (input, context) =>
      context.mode === 'create'
        ? repository.create(input, context.signal)
        : context.key === undefined
          ? Promise.reject(new TypeError('Edit mode requires a user id.'))
          : repository.update(context.key, input, context.signal),
  },
})

const editorTitle = computed(() =>
  editor.mode.value === 'edit'
    ? locale.t('starter.users.editTitle')
    : locale.t('starter.users.createTitle'),
)
const editorDescription = computed(() =>
  editor.mode.value === 'edit'
    ? locale.t('starter.users.editDescription')
    : locale.t('starter.users.createDescription'),
)

async function ensureCapability(capability: StarterCapability): Promise<boolean> {
  if (await access.can(capability)) return true
  feedback.toast.error(locale.t('starter.users.forbidden'))
  return false
}

async function openCreate(): Promise<void> {
  if (!(await ensureCapability(starterCapabilities.usersCreate))) return
  editor.beginCreate()
  editorOpen.value = true
}

async function openEdit(user: StarterUserRecord): Promise<void> {
  if (!(await ensureCapability(starterCapabilities.usersUpdate))) return
  editorOpen.value = true
  void editor.beginEdit(user.id)
}

function actionsFor(user: StarterUserRecord): readonly RowAction[] {
  return [
    {
      key: 'edit',
      label: locale.t('starter.users.edit'),
      icon: '$edit',
      intent: 'primary',
      disabled: deletingId.value !== undefined,
      hidden: !canUpdate.value,
      priority: 0,
    },
    {
      key: 'delete',
      label: locale.t('starter.users.delete'),
      icon: '$delete',
      intent: 'danger',
      disabled: deletingId.value !== undefined && deletingId.value !== user.id,
      hidden: !canDelete.value,
      loading: deletingId.value === user.id,
      priority: 1,
    },
  ]
}

function actionErrorMessage(error: unknown): string {
  return normalizeError(error).message
}

async function removeUser(user: StarterUserRecord): Promise<void> {
  if (!(await ensureCapability(starterCapabilities.usersDelete))) return
  const confirmed = await feedback.confirm({
    title: locale.t('starter.users.deleteTitle'),
    message: locale.t('starter.users.deleteMessage', { name: user.name }),
    confirmText: locale.t('starter.users.deleteConfirm'),
    intent: 'danger',
  })
  if (!confirmed) return
  if (!(await ensureCapability(starterCapabilities.usersDelete))) return

  deletingId.value = user.id
  try {
    await repository.remove(user.id, new AbortController().signal)
    feedback.toast.success(locale.t('starter.users.deleted', { name: user.name }))
    await refresh()
  } catch (error) {
    feedback.toast.error(actionErrorMessage(error))
  } finally {
    deletingId.value = undefined
  }
}

async function runAction(action: RowAction, user: StarterUserRecord): Promise<void> {
  if (action.key === 'edit') await openEdit(user)
  if (action.key === 'delete') await removeUser(user)
}

function handleSubmitted(user: StarterUserRecord): void {
  const messageKey =
    editor.mode.value === 'edit' ? 'starter.users.updated' : 'starter.users.created'
  feedback.toast.success(locale.t(messageKey, { name: user.name }))
  void refresh()
}

watch(
  () => access.revision.value,
  async () => {
    if (!editorOpen.value) return
    const requiredCapability =
      editor.mode.value === 'edit'
        ? starterCapabilities.usersUpdate
        : starterCapabilities.usersCreate
    if (await access.can(requiredCapability)) return
    editorOpen.value = false
    feedback.toast.error(locale.t('starter.users.permissionChanged'))
  },
)
</script>

<template>
  <div class="starter-page starter-users-page">
    <VaPageHeader
      :description="locale.t('starter.users.description')"
      :title="locale.t('starter.users.title')"
    >
      <template #actions>
        <VelaAccessBoundary :capability="starterCapabilities.usersCreate">
          <VaButton prepend-icon="$add" @click="openCreate">
            {{ locale.t('starter.users.new') }}
          </VaButton>
        </VelaAccessBoundary>
      </template>
    </VaPageHeader>

    <VaDataPage
      :columns="columns"
      :empty-text="locale.t('starter.users.emptyText')"
      :empty-title="locale.t('starter.users.emptyTitle')"
      :error="error"
      :items="items"
      :layout="{ mode: 'adaptive', autoPinActions: true, resizable: true }"
      :loading="loading"
      :pagination="paginationMeta"
      :refreshing="refreshing"
      @paginate="paginate"
      @retry="execute"
    >
      <template #filters>
        <VaFilterBar
          :fields="filterFields"
          immediate
          :model-value="filterModel"
          @apply="applyFilters"
          @reset="applyFilters({})"
          @update:model-value="applyFilters"
        />
      </template>
      <template #toolbar>
        <VaButton
          appearance="text"
          :loading="refreshing"
          prepend-icon="$refresh"
          size="small"
          @click="refresh"
        >
          {{ locale.t('starter.users.refresh') }}
        </VaButton>
      </template>
      <template #[`item.actions`]="{ item }">
        <VaRowActions
          :actions="actionsFor(item)"
          :max-visible="2"
          @action="runAction($event, item)"
        />
      </template>
    </VaDataPage>

    <VaFormDialog
      v-model="editorOpen"
      :controller="editor"
      :description="editorDescription"
      :schema="editorSchema"
      :title="editorTitle"
      width="760"
      @submitted="handleSubmitted"
    />
  </div>
</template>

<style scoped>
.starter-users-page {
  gap: var(--v-space-5);
  min-inline-size: 0;
}

.starter-users-page :deep(.va-data-page) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--v-space-4);
}

.starter-users-page :deep(.va-data-page__filters) {
  margin-block-end: 0;
}

.starter-users-page :deep(.va-data-page__toolbar) {
  margin-block-start: calc(var(--v-space-2) * -1);
}
</style>
