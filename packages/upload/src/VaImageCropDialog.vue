<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type Cropper from 'cropperjs'
import { VIcon } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaIconButton, VaModal } from '@vela-admin/ui'

import { canvasToFile } from './image'
import type { ImageCropOptions } from './types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    file?: File | undefined
    options?: ImageCropOptions | undefined
    title?: string | undefined
  }>(),
  {
    file: undefined,
    options: () => ({}),
    title: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  complete: [file: File]
  cancel: []
  error: [error: unknown]
}>()

const locale = useVelaLocale()
const image = ref<HTMLImageElement>()
const host = ref<HTMLElement>()
const sourceUrl = ref<string>()
const saving = ref(false)
let cropper: Cropper | undefined
let flipped = false
let mountGeneration = 0

const shape = computed(() => props.options.shape ?? 'rectangle')
const aspectRatio = computed(() => props.options.aspectRatio)

function normalizedDimension(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(1, Math.round(value))
}

const outputSize = computed(() => {
  const ratio = aspectRatio.value
  let width = normalizedDimension(props.options.outputWidth)
  let height = normalizedDimension(props.options.outputHeight)
  if (ratio && width && !height) height = Math.max(1, Math.round(width / ratio))
  if (ratio && height && !width) width = Math.max(1, Math.round(height * ratio))
  return { width, height }
})

function cleanup(): void {
  mountGeneration += 1
  cropper?.destroy()
  cropper = undefined
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
  sourceUrl.value = undefined
  flipped = false
}

async function mountCropper(): Promise<void> {
  cleanup()
  if (!props.modelValue || !props.file) return
  const generation = mountGeneration
  sourceUrl.value = URL.createObjectURL(props.file)
  await nextTick()
  const { default: CropperConstructor } = await import('cropperjs')
  if (generation !== mountGeneration || !image.value || !host.value) return
  cropper = new CropperConstructor(image.value, { container: host.value })
  const selection = cropper.getCropperSelection()
  if (selection) {
    selection.aspectRatio = aspectRatio.value ?? Number.NaN
    selection.initialAspectRatio = aspectRatio.value ?? Number.NaN
    selection.initialCoverage = 0.78
    selection.keyboard = true
    selection.movable = true
    selection.resizable = true
    selection.zoomable = true
    selection.$reset()
  }
  const cropperImage = cropper.getCropperImage()
  if (cropperImage) {
    cropperImage.rotatable = true
    cropperImage.scalable = true
    cropperImage.translatable = true
  }
}

watch(
  () => [props.modelValue, props.file, aspectRatio.value] as const,
  () => void mountCropper(),
)

onBeforeUnmount(cleanup)

function transform(action: 'zoom-in' | 'zoom-out' | 'rotate-left' | 'rotate-right' | 'flip'): void {
  const selection = cropper?.getCropperSelection()
  const cropperImage = cropper?.getCropperImage()
  if (action === 'zoom-in') selection?.$zoom(0.1)
  if (action === 'zoom-out') selection?.$zoom(-0.1)
  if (action === 'rotate-left') cropperImage?.$rotate('-90deg')
  if (action === 'rotate-right') cropperImage?.$rotate('90deg')
  if (action === 'flip' && cropperImage) {
    flipped = !flipped
    cropperImage.$scale(flipped ? -1 : 1, 1)
  }
}

function reset(): void {
  cropper?.getCropperImage()?.$resetTransform()
  cropper?.getCropperSelection()?.$reset()
  flipped = false
}

function close(cancelled = true): void {
  emit('update:modelValue', false)
  if (cancelled) emit('cancel')
  cleanup()
}

async function complete(): Promise<void> {
  const selection = cropper?.getCropperSelection()
  if (!selection || !props.file || saving.value) return
  saving.value = true
  try {
    const canvas = await selection.$toCanvas({
      ...(outputSize.value.width === undefined ? {} : { width: outputSize.value.width }),
      ...(outputSize.value.height === undefined ? {} : { height: outputSize.value.height }),
    })
    const file = await canvasToFile(canvas, props.file, {
      ...(props.options.mimeType === undefined ? {} : { mimeType: props.options.mimeType }),
      ...(props.options.quality === undefined ? {} : { quality: props.options.quality }),
    })
    emit('complete', file)
    close(false)
  } catch (error) {
    emit('error', error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <VaModal
    :busy="saving"
    :model-value="modelValue"
    :title="title ?? locale.t('upload.crop.title')"
    width="min(56rem, calc(100vw - 2rem))"
    @update:model-value="!$event && close()"
  >
    <div class="va-image-cropper" :class="`va-image-cropper--${shape}`">
      <div ref="host" class="va-image-cropper__stage">
        <img
          v-if="sourceUrl"
          ref="image"
          :alt="file?.name ?? ''"
          class="va-image-cropper__source"
          :src="sourceUrl"
        />
      </div>

      <div
        class="va-image-cropper__toolbar"
        role="toolbar"
        :aria-label="locale.t('upload.crop.tools')"
      >
        <VaIconButton
          icon="$zoomOut"
          :label="locale.t('upload.crop.zoomOut')"
          @click="transform('zoom-out')"
        />
        <VaIconButton
          icon="$zoomIn"
          :label="locale.t('upload.crop.zoomIn')"
          @click="transform('zoom-in')"
        />
        <span aria-hidden="true" class="va-image-cropper__divider" />
        <VaIconButton
          icon="$rotateLeft"
          :label="locale.t('upload.crop.rotateLeft')"
          @click="transform('rotate-left')"
        />
        <VaIconButton
          icon="$rotateRight"
          :label="locale.t('upload.crop.rotateRight')"
          @click="transform('rotate-right')"
        />
        <VaIconButton
          icon="$flipHorizontal"
          :label="locale.t('upload.crop.flip')"
          @click="transform('flip')"
        />
        <VaIconButton icon="$refresh" :label="locale.t('upload.crop.reset')" @click="reset" />
        <span class="va-image-cropper__hint">
          <VIcon icon="$crop" />
          {{ locale.t('upload.crop.hint') }}
        </span>
      </div>
    </div>

    <template #footer>
      <VaButton appearance="text" intent="neutral" :disabled="saving" @click="close()">
        {{ locale.t('common.cancel') }}
      </VaButton>
      <VaButton :loading="saving" prepend-icon="$crop" @click="complete">
        {{ locale.t('upload.crop.apply') }}
      </VaButton>
    </template>
  </VaModal>
</template>

<style>
.va-image-cropper {
  display: grid;
  gap: var(--v-space-4);
}

.va-image-cropper__stage {
  position: relative;
  block-size: var(--v-upload-cropper-height);
  min-block-size: var(--v-upload-cropper-min-height);
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 45%,
      rgba(var(--v-theme-primary), var(--v-upload-cropper-glow-opacity)),
      transparent 58%
    ),
    rgb(var(--v-theme-surface-light));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-xl);
}

.va-image-cropper__source {
  display: block;
  max-inline-size: 100%;
}

.va-image-cropper__stage cropper-canvas {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.va-image-cropper--circle cropper-selection {
  border-radius: var(--v-radius-pill);
  overflow: hidden;
}

.va-image-cropper__toolbar {
  display: flex;
  gap: var(--v-space-1);
  align-items: center;
  min-block-size: var(--v-control-height-lg);
  padding: var(--v-space-2);
  background: rgba(var(--v-theme-surface-light), var(--v-runtime-surface-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
}

.va-image-cropper__divider {
  align-self: stretch;
  inline-size: 1px;
  margin-inline: var(--v-space-1);
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-image-cropper__hint {
  display: inline-flex;
  gap: var(--v-space-2);
  align-items: center;
  margin-inline-start: auto;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}

.va-image-cropper__hint .v-icon {
  font-size: var(--v-upload-toolbar-icon-size);
}

@media (max-width: 599px) {
  .va-image-cropper__stage {
    block-size: var(--v-upload-cropper-mobile-height);
  }

  .va-image-cropper__hint {
    display: none;
  }
}
</style>
