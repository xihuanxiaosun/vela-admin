<script setup lang="ts">
import { computed } from 'vue'
import { VCard, VCardText, VCardTitle } from 'vuetify/components'
import { createWebStorageAdapter } from '@vela-admin/adapters'
import {
  createRuleValidationAdapter,
  email,
  maxLength,
  minLength,
  required,
  useForm,
  useFormDraft,
  VaForm,
  VaFormBuilder,
  VaFormDraftNotice,
  type FormSchema,
  type ValidationRule,
} from '@vela-admin/forms'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaTag } from '@vela-admin/ui'

const emit = defineEmits<{
  message: [value: string]
}>()
const locale = useVelaLocale()

interface ProfileForm {
  [key: string]: unknown
  displayName: string
  email: string
  role: string
  department: string | null
  workspaceMode: string
  seats: number
  biography: string
  notifications: boolean
  inviteAnother: boolean
  inviteEmail: string
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('Cancelled', 'AbortError')
}

const uniqueEmail: ValidationRule<ProfileForm> = async (value, { signal }) => {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, 260)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout)
        reject(abortReason(signal))
      },
      { once: true },
    )
  })
  return value === 'taken@example.dev' ? locale.t('playground.forms.emailTaken') : undefined
}

const schema = computed<FormSchema<ProfileForm>>(() => ({
  sections: [
    {
      key: 'identity',
      title: locale.t('playground.forms.section.identity'),
      description: locale.t('playground.forms.section.identityDescription'),
      fields: [
        {
          key: 'displayName',
          kind: 'text',
          label: locale.t('playground.forms.displayName'),
          required: true,
          placeholder: locale.t('playground.forms.displayNamePlaceholder'),
          layout: { md: 6 },
        },
        {
          key: 'email',
          kind: 'email',
          label: locale.t('playground.forms.accountEmail'),
          required: true,
          placeholder: 'name@example.dev',
          layout: { md: 6 },
        },
        {
          key: 'role',
          kind: 'autocomplete',
          label: locale.t('playground.forms.defaultRole'),
          options: [
            { title: locale.t('playground.common.administrator'), value: 'administrator' },
            { title: locale.t('playground.common.editor'), value: 'editor' },
            { title: locale.t('playground.common.analyst'), value: 'analyst' },
          ],
          layout: { md: 6 },
        },
        {
          key: 'department',
          kind: 'autocomplete',
          label: locale.t('playground.forms.department'),
          hint: locale.t('playground.forms.departmentHint'),
          clearable: true,
          optionSource: {
            async load({ query, signal }) {
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(resolve, 220)
                signal.addEventListener(
                  'abort',
                  () => {
                    clearTimeout(timeout)
                    reject(abortReason(signal))
                  },
                  { once: true },
                )
              })
              const options = [
                { title: locale.t('playground.common.operations'), value: 'operations' },
                { title: locale.t('playground.forms.department.product'), value: 'product' },
                { title: locale.t('playground.common.finance'), value: 'finance' },
                {
                  title: locale.t('playground.forms.department.customerSuccess'),
                  value: 'customer-success',
                },
              ]
              return options.filter(({ title }) =>
                title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
              )
            },
          },
          layout: { md: 6 },
        },
        {
          key: 'seats',
          kind: 'number',
          label: locale.t('playground.forms.licensedSeats'),
          layout: { md: 6 },
          props: { min: 1, max: 500 },
        },
        {
          key: 'workspaceMode',
          kind: 'radio',
          label: locale.t('playground.forms.workspaceMode'),
          options: [
            { title: locale.t('playground.forms.collaborative'), value: 'collaborative' },
            { title: locale.t('playground.forms.private'), value: 'private' },
          ],
          layout: { md: 6 },
        },
        {
          key: 'biography',
          kind: 'textarea',
          label: locale.t('playground.forms.descriptionField'),
          hint: locale.t('playground.forms.descriptionHint'),
          props: { rows: 3 },
        },
        {
          key: 'notifications',
          kind: 'switch',
          label: locale.t('playground.forms.notifications'),
        },
      ],
    },
    {
      key: 'invitation',
      title: locale.t('playground.forms.section.invitation'),
      fields: [
        {
          key: 'inviteAnother',
          kind: 'checkbox',
          label: locale.t('playground.forms.inviteAnother'),
        },
        {
          key: 'inviteEmail',
          kind: 'email',
          label: locale.t('playground.forms.invitationEmail'),
          visible: (values) => values.inviteAnother,
        },
      ],
    },
  ],
}))

const form = useForm<ProfileForm>({
  initialValues: {
    displayName: '',
    email: '',
    role: 'analyst',
    department: null,
    workspaceMode: 'collaborative',
    seats: 15,
    biography: '',
    notifications: true,
    inviteAnother: false,
    inviteEmail: '',
  },
  validation: createRuleValidationAdapter<ProfileForm>({
    fields: {
      displayName: [required(), minLength(2), maxLength(80)],
      email: [required(), email(), uniqueEmail],
      biography: [maxLength(240)],
      inviteEmail: [
        (value, { values }) =>
          values.inviteAnother && (value === null || value === undefined || value === '')
            ? locale.t('playground.forms.invitationRequired')
            : undefined,
        email(),
      ],
    },
  }),
})

const draft = useFormDraft({
  form,
  storage: createWebStorageAdapter(window.localStorage, { namespace: 'vela-playground' }),
  storageKey: 'workspace-profile.draft',
  schemaVersion: 'profile-v1',
})

async function submit(): Promise<void> {
  const result = await form.submit(async ({ values, signal }) => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, 700)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout)
          reject(abortReason(signal))
        },
        { once: true },
      )
    })
    return values
  })
  if (result) {
    form.commit(result)
    emit('message', locale.t('playground.forms.saved', { name: result.displayName }))
  }
}
</script>

<template>
  <div class="playground-stack">
    <div class="playground-page-heading">
      <div>
        <p class="playground-eyebrow">{{ locale.t('playground.forms.eyebrow') }}</p>
        <h1>{{ locale.t('playground.forms.title') }}</h1>
        <p>{{ locale.t('playground.forms.description') }}</p>
      </div>
    </div>

    <VCard class="playground-panel playground-form-card">
      <VCardTitle class="playground-panel__header">
        <div>
          <strong>{{ locale.t('playground.forms.cardTitle') }}</strong
          ><span>{{ locale.t('playground.forms.tryEmail') }}</span>
        </div>
        <VaTag :tone="form.dirty.value ? 'warning' : 'neutral'">
          {{
            form.dirty.value
              ? locale.t('playground.forms.unsaved')
              : locale.t('playground.forms.noChanges')
          }}
        </VaTag>
      </VCardTitle>
      <VCardText class="playground-panel__body">
        <VaForm :loading="form.submitting.value" @submit="submit">
          <VaFormDraftNotice :controller="draft" />
          <!-- @vue-generic {ProfileForm} -->
          <VaFormBuilder
            :errors="form.errors.value"
            :model-value="form.values.value"
            :schema="schema"
            @blur="form.validate"
            @update:model-value="form.setValues"
          />
          <div class="playground-form-actions">
            <VaButton appearance="text" intent="neutral" type="button" @click="form.reset()">
              {{ locale.t('common.reset') }}
            </VaButton>
            <VaButton
              :loading="form.submitting.value"
              :loading-text="locale.t('playground.forms.savingProfile')"
              type="submit"
            >
              {{ locale.t('playground.forms.saveProfile') }}
            </VaButton>
          </div>
        </VaForm>
      </VCardText>
    </VCard>
  </div>
</template>
