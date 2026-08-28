<script setup lang="ts" generic="TValues extends Record<string, unknown>, TResult, TKey">
import { computed, useId, useSlots } from 'vue'
import { VAlert } from 'vuetify/components'
import type { Awaitable } from '@vela-admin/contracts'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaModal, VaSkeleton, VaStateView } from '@vela-admin/ui'

import type { FormFieldRegistry } from './field-registry'
import type { FormSchema } from './schema'
import type { FormDraftController } from './use-form-draft'
import type { FormWorkflowController } from './use-form-workflow'
import VaForm from './VaForm.vue'
import VaFormBuilder from './VaFormBuilder.vue'
import VaFormDraftNotice from './VaFormDraftNotice.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    schema: FormSchema<TValues>
    controller: FormWorkflowController<TValues, TResult, TKey>
    draft?: FormDraftController<TValues> | undefined
    description?: string | undefined
    registry?: FormFieldRegistry | undefined
    width?: string | number
    fullscreenOnMobile?: boolean
    closeOnSuccess?: boolean
    cancelText?: string | undefined
    submitText?: string | undefined
    loadingText?: string | undefined
    beforeClose?: (() => Awaitable<boolean>) | undefined
  }>(),
  {
    description: undefined,
    registry: undefined,
    width: 760,
    fullscreenOnMobile: true,
    closeOnSuccess: true,
    cancelText: undefined,
    submitText: undefined,
    loadingText: undefined,
    beforeClose: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submitted: [result: TResult]
}>()

const locale = useVelaLocale()
const slots = useSlots()
const formId = useId()
const fieldSlotNames = computed(() =>
  Object.keys(slots).filter((name) => name.startsWith('field-')),
)
const builderRegistryProps = computed(() =>
  props.registry === undefined ? {} : { registry: props.registry },
)

function updateModel(value: boolean): void {
  if (!value) props.controller.cancel()
  emit('update:modelValue', value)
}

async function submit(): Promise<void> {
  const result = await props.controller.submit()
  if (result === undefined) return
  emit('submitted', result)
  if (props.closeOnSuccess) updateModel(false)
}
</script>

<template>
  <VaModal
    :model-value="modelValue"
    :before-close="beforeClose"
    :busy="controller.form.submitting.value"
    :description="description"
    :fullscreen-on-mobile="fullscreenOnMobile"
    :title="title"
    :width="width"
    @update:model-value="updateModel"
  >
    <div v-if="controller.loading.value" class="va-form-dialog__state">
      <VaSkeleton :label="locale.t('forms.dialog.loading')" preset="form" />
    </div>
    <div v-else-if="controller.loadError.value" class="va-form-dialog__state">
      <VaStateView
        :action-text="locale.t('common.retry')"
        kind="error"
        :text="controller.loadError.value.message"
        :title="locale.t('forms.dialog.loadError')"
        @action="controller.retryLoad"
      />
    </div>
    <VaForm
      v-else
      :id="formId"
      class="va-form-dialog__form"
      :loading="controller.form.submitting.value"
      @submit="submit"
    >
      <VaFormDraftNotice v-if="draft" :controller="draft" />
      <VAlert
        v-if="controller.submitError.value"
        class="va-form-dialog__error"
        color="error"
        density="compact"
        :text="controller.submitError.value.message"
        type="error"
      />
      <!-- @vue-generic {TValues} -->
      <VaFormBuilder
        v-bind="builderRegistryProps"
        :errors="controller.form.errors.value"
        :model-value="controller.form.values.value"
        :schema="schema"
        @blur="controller.form.validate"
        @update:model-value="controller.form.setValues"
      >
        <template v-for="slotName in fieldSlotNames" :key="slotName" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
      </VaFormBuilder>
    </VaForm>
    <template #footer="{ close }">
      <VaButton
        appearance="text"
        intent="neutral"
        :disabled="controller.form.submitting.value"
        @click="close"
      >
        {{ cancelText ?? locale.t('common.cancel') }}
      </VaButton>
      <VaButton
        :disabled="controller.loading.value || Boolean(controller.loadError.value)"
        :form="formId"
        :loading="controller.form.submitting.value"
        :loading-text="loadingText ?? locale.t('forms.dialog.saving')"
        type="submit"
      >
        {{ submitText ?? locale.t('forms.dialog.save') }}
      </VaButton>
    </template>
  </VaModal>
</template>

<style>
.va-form-dialog__state {
  min-block-size: var(--v-state-view-min-height);
}

.va-form-dialog__error {
  margin-block-end: var(--v-space-4);
}
</style>
