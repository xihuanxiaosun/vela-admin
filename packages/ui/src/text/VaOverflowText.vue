<script setup lang="ts">
import { mergeProps, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import { VTooltip } from 'vuetify/components'

import { isContentTruncated } from './overflow'

const props = withDefaults(
  defineProps<{
    text: string | number
    tooltip?: string | undefined
    lines?: number
    location?: 'top' | 'bottom' | 'start' | 'end'
  }>(),
  {
    tooltip: undefined,
    lines: 1,
    location: 'top',
  },
)

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const content = ref<HTMLElement | null>(null)
const truncated = ref(false)
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined
let frame: number | undefined

function measure(): void {
  if (!content.value) return
  truncated.value = isContentTruncated(content.value)
}

function scheduleMeasure(): void {
  if (typeof requestAnimationFrame === 'undefined') return
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measure)
}

async function connect(): Promise<void> {
  await nextTick()
  if (!content.value) return
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(content.value)
  }
  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(scheduleMeasure)
    mutationObserver.observe(content.value, { childList: true, characterData: true, subtree: true })
  }
  scheduleMeasure()
}

onMounted(connect)
watch(() => [props.text, props.lines], connect)
onBeforeUnmount(() => {
  if (frame !== undefined) cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
})
</script>

<template>
  <VTooltip
    :disabled="!truncated"
    :eager="false"
    :location="location"
    :text="tooltip ?? String(text)"
  >
    <template #activator="{ props: activatorProps }">
      <span
        ref="content"
        v-bind="mergeProps(activatorProps, attrs)"
        class="va-overflow-text"
        :class="{ 'va-overflow-text--multiline': lines > 1 }"
        :style="{ '--va-overflow-lines': String(lines) }"
      >
        <slot>{{ text }}</slot>
      </span>
    </template>
    {{ tooltip ?? String(text) }}
  </VTooltip>
</template>

<style>
.va-overflow-text {
  display: block;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-overflow-text--multiline {
  display: -webkit-box;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--va-overflow-lines);
}
</style>
