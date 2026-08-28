<script setup lang="ts" generic="TValues">
import { ref } from 'vue'
import { VAlert } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton } from '@vela-admin/ui'

import type { FormDraftController } from './use-form-draft'

const props = defineProps<{
  controller: FormDraftController<TValues>
  title?: string
  text?: string
  restoreText?: string
  discardText?: string
}>()

const emit = defineEmits<{
  restore: []
  discard: []
}>()

const locale = useVelaLocale()
const discarding = ref(false)

function restore(): void {
  if (!props.controller.restore()) return
  emit('restore')
}

async function discard(): Promise<void> {
  if (discarding.value) return
  discarding.value = true
  await props.controller.discard()
  discarding.value = false
  emit('discard')
}
</script>

<template>
  <VAlert
    v-if="controller.restorable.value"
    class="va-form-draft-notice"
    color="info"
    icon="$info"
    :text="text ?? locale.t('forms.draft.text')"
    :title="title ?? locale.t('forms.draft.title')"
    variant="tonal"
  >
    <template #append>
      <div class="va-form-draft-notice__actions">
        <VaButton
          appearance="text"
          intent="neutral"
          :loading="discarding"
          :loading-text="discardText ?? locale.t('forms.draft.discard')"
          size="small"
          @click="discard"
        >
          {{ discardText ?? locale.t('forms.draft.discard') }}
        </VaButton>
        <VaButton appearance="tonal" size="small" @click="restore">
          {{ restoreText ?? locale.t('forms.draft.restore') }}
        </VaButton>
      </div>
    </template>
  </VAlert>
</template>

<style>
.va-form-draft-notice {
  margin-block-end: var(--v-space-4);
  border: 1px solid rgba(var(--v-theme-info), var(--v-form-section-border-opacity));
}

.va-form-draft-notice__actions {
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
}

@media (max-width: 599px) {
  .va-form-draft-notice__actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>
