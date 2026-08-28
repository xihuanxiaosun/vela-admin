<script setup lang="ts">
import { VForm } from 'vuetify/components'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    disabled: false,
    loading: false,
  },
)

const emit = defineEmits<{
  submit: [event: SubmitEvent]
}>()

function onSubmit(event: SubmitEvent): void {
  event.preventDefault()
  if (!props.disabled && !props.loading) emit('submit', event)
}
</script>

<template>
  <VForm class="va-form" :aria-busy="loading || undefined" @submit="onSubmit">
    <fieldset class="va-form__fieldset" :disabled="disabled || loading">
      <slot />
    </fieldset>
  </VForm>
</template>

<style>
.va-form__fieldset {
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  border: 0;
}
</style>
