<script setup lang="ts" generic="TValue, TMetadata">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { VIcon, VImg, VProgressCircular } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaButton, VaIconButton } from '@vela-admin/ui'

import { DEFAULT_IMAGE_ACCEPT, resolveCommonUploadUrl } from './image'
import type { UploadQueue } from './upload-queue'
import type {
  UploadBeforeRemove,
  ImageCropOptions,
  UploadFilePreparer,
  UploadQueueItem,
  UploadResultUrlResolver,
} from './types'
import VaImageCropDialog from './VaImageCropDialog.vue'
import VaImagePreviewDialog from './VaImagePreviewDialog.vue'

const props = withDefaults(
  defineProps<{
    queue: UploadQueue<TValue, File, TMetadata>
    modelValue?: string | undefined
    name?: string | undefined
    accept?: string
    disabled?: boolean
    readonly?: boolean
    capture?: 'user' | 'environment' | undefined
    size?: number
    crop?: boolean
    cropOptions?: ImageCropOptions
    prepareFile?: UploadFilePreparer<File> | undefined
    beforeRemove?: UploadBeforeRemove<TValue, File, TMetadata> | undefined
    resolveUrl?: UploadResultUrlResolver<TValue> | undefined
    title?: string
    description?: string
  }>(),
  {
    accept: DEFAULT_IMAGE_ACCEPT,
    disabled: false,
    readonly: false,
    capture: undefined,
    size: 112,
    crop: true,
    cropOptions: () => ({
      aspectRatio: 1,
      shape: 'circle',
      outputWidth: 512,
      outputHeight: 512,
      mimeType: 'image/webp',
      quality: 0.9,
    }),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  uploaded: [item: UploadQueueItem<TValue, File, TMetadata>]
  remove: []
  'remove-error': [error: unknown]
  'prepare-error': [error: unknown, file: File]
}>()

const locale = useVelaLocale()
const input = ref<HTMLInputElement>()
const dragging = ref(false)
const previewOpen = ref(false)
const cropOpen = ref(false)
const cropFile = ref<File>()
const preparing = ref(false)
const removing = ref(false)
const localError = ref<string>()
const emittedIds = new Set<string>()
let resolveCrop: ((file: File | undefined) => Promise<void>) | undefined
let rejectCrop: ((error: unknown) => void) | undefined

const latest = computed(() => props.queue.items.value.at(-1))
const currentImage = computed(() => latest.value?.previewUrl ?? props.modelValue)
const uploading = computed(() =>
  ['queued', 'validating', 'uploading'].includes(latest.value?.status ?? ''),
)
const progress = computed(() => latest.value?.progress.percentage ?? 0)
const resolvedTitle = computed(() => props.title ?? locale.t('upload.avatar.title'))
const resolvedDescription = computed(
  () => props.description ?? locale.t('upload.avatar.description'),
)

watch(
  props.queue.items,
  (items) => {
    for (const item of items) {
      if (
        item.source !== 'local' ||
        item.status !== 'success' ||
        !item.result ||
        emittedIds.has(item.id)
      )
        continue
      emittedIds.add(item.id)
      const resolver = props.resolveUrl ?? resolveCommonUploadUrl
      const url = resolver(item.result.value)
      if (url) emit('update:modelValue', url)
      emit('uploaded', item)
    }
  },
  { deep: true },
)

function clearQueue(): void {
  for (const item of props.queue.items.value) props.queue.remove(item.id)
}

async function runHostPreparer(file: File): Promise<File | undefined> {
  return props.prepareFile ? props.prepareFile(file) : file
}

function prepareAvatar(file: File): Promise<File | undefined> {
  if (!props.crop) return Promise.resolve(runHostPreparer(file))
  cropFile.value = file
  cropOpen.value = true
  return new Promise<File | undefined>((resolve, reject) => {
    resolveCrop = async (cropped) => {
      try {
        resolve(cropped ? await runHostPreparer(cropped) : undefined)
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error('Image preprocessing failed.', { cause: error }),
        )
      } finally {
        resolveCrop = undefined
        rejectCrop = undefined
        cropFile.value = undefined
      }
    }
    rejectCrop = reject
  })
}

async function add(file: File | undefined): Promise<void> {
  if (!file || props.disabled || preparing.value) return
  localError.value = undefined
  preparing.value = true
  try {
    const prepared = await prepareAvatar(file)
    if (!prepared) return
    clearQueue()
    props.queue.add([prepared])
  } catch (error) {
    localError.value = locale.t('upload.error.prepare')
    emit('prepare-error', error, file)
  } finally {
    preparing.value = false
    if (input.value) input.value.value = ''
  }
}

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  void add(target.files?.[0])
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  void add(event.dataTransfer?.files[0])
}

async function remove(): Promise<void> {
  if (props.disabled || removing.value) return
  removing.value = true
  localError.value = undefined
  try {
    const allowed = props.beforeRemove
      ? await props.beforeRemove({
          ...(latest.value ? { item: latest.value } : {}),
          ...(currentImage.value ? { url: currentImage.value } : {}),
        })
      : true
    if (!allowed) return
    clearQueue()
    emit('update:modelValue', undefined)
    emit('remove')
  } catch (error) {
    localError.value = locale.t('upload.error.remove')
    emit('remove-error', error)
  } finally {
    removing.value = false
  }
}

function finishCrop(file: File): void {
  void resolveCrop?.(file)
}

function cancelCrop(): void {
  void resolveCrop?.(undefined)
}

function failCrop(error: unknown): void {
  rejectCrop?.(error)
  resolveCrop = undefined
  rejectCrop = undefined
  cropFile.value = undefined
}

onBeforeUnmount(cancelCrop)
</script>

<template>
  <div class="va-avatar-upload" :class="{ 'va-avatar-upload--dragging': dragging }">
    <div
      class="va-avatar-upload__visual"
      :style="{ '--va-avatar-upload-size': `${size}px` }"
      @dragenter.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <button
        :aria-label="locale.t('upload.action.preview')"
        class="va-avatar-upload__preview"
        :disabled="!currentImage"
        type="button"
        @click="previewOpen = true"
      >
        <VImg v-if="currentImage" :alt="name ?? resolvedTitle" cover :src="currentImage" />
        <VIcon v-else icon="$account" />
      </button>
      <div v-if="uploading || preparing" class="va-avatar-upload__progress" role="status">
        <VProgressCircular
          color="primary"
          :indeterminate="preparing || latest?.progress.percentage === undefined"
          :model-value="progress"
          :size="Math.max(24, size - 10)"
          :width="4"
        />
        <span>{{
          preparing ? locale.t('upload.status.preparing') : `${Math.round(progress)}%`
        }}</span>
      </div>
      <VaIconButton
        v-if="currentImage && !uploading && !readonly"
        class="va-avatar-upload__remove"
        icon="$delete"
        intent="danger"
        :label="locale.t('upload.action.remove')"
        :disabled="disabled"
        :loading="removing"
        @click="remove"
      />
    </div>

    <div class="va-avatar-upload__content">
      <div>
        <strong>{{ resolvedTitle }}</strong>
        <p>{{ resolvedDescription }}</p>
      </div>
      <div v-if="!readonly" class="va-avatar-upload__actions">
        <VaButton
          appearance="tonal"
          :disabled="disabled || preparing || uploading"
          prepend-icon="$upload"
          size="small"
          @click="input?.click()"
        >
          {{ currentImage ? locale.t('upload.action.replace') : locale.t('upload.action.choose') }}
        </VaButton>
        <span>{{ locale.t('upload.avatar.dropHint') }}</span>
      </div>
      <p v-if="latest?.error || localError" class="va-avatar-upload__error" role="alert">
        {{ latest?.error?.message ?? localError }}
      </p>
      <input
        ref="input"
        :accept="accept"
        :aria-label="resolvedTitle"
        :capture="capture"
        class="va-avatar-upload__input"
        :disabled="disabled"
        type="file"
        @change="onInput"
      />
    </div>

    <VaImageCropDialog
      v-model="cropOpen"
      :file="cropFile"
      :options="cropOptions"
      @cancel="cancelCrop"
      @complete="finishCrop"
      @error="failCrop"
    />
    <VaImagePreviewDialog
      v-model="previewOpen"
      :alt="name ?? resolvedTitle"
      :src="currentImage"
      :title="resolvedTitle"
    />
  </div>
</template>

<style>
.va-avatar-upload {
  display: flex;
  gap: var(--v-space-5);
  align-items: center;
  padding: var(--v-space-4);
  background: rgba(var(--v-theme-surface-light), var(--v-runtime-surface-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-xl);
  transition:
    border-color var(--v-motion-duration-standard) var(--v-motion-easing-standard),
    box-shadow var(--v-motion-duration-standard) var(--v-motion-easing-standard);
}

.va-avatar-upload--dragging {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: var(--v-upload-dropzone-focus-shadow);
}

.va-avatar-upload__visual {
  position: relative;
  flex: 0 0 var(--va-avatar-upload-size);
  inline-size: var(--va-avatar-upload-size);
  block-size: var(--va-avatar-upload-size);
}

.va-avatar-upload__preview {
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  padding: 0;
  overflow: hidden;
  color: rgb(var(--v-theme-primary));
  cursor: zoom-in;
  background:
    linear-gradient(
      rgba(var(--v-theme-primary), var(--v-avatar-tint-opacity)),
      rgba(var(--v-theme-primary), var(--v-avatar-tint-opacity))
    ),
    rgb(var(--v-theme-surface));
  border: 1px dashed rgba(var(--v-theme-primary), var(--v-upload-dropzone-border-opacity));
  border-radius: var(--v-radius-pill);
  box-shadow: var(--v-avatar-shadow);
}

.va-avatar-upload__preview:disabled {
  cursor: default;
}

.va-avatar-upload__preview .v-img {
  inline-size: 100%;
  block-size: 100%;
}

.va-avatar-upload__progress {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgb(var(--v-theme-primary));
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-semibold);
  background: rgba(var(--v-theme-surface), var(--v-upload-preparing-opacity));
  border-radius: var(--v-radius-pill);
  backdrop-filter: blur(var(--v-upload-backdrop-blur));
}

.va-avatar-upload__progress > * {
  grid-area: 1 / 1;
}

.va-avatar-upload__remove {
  position: absolute;
  inset-block-end: 0;
  inset-inline-end: 0;
  color: rgb(var(--v-theme-on-error));
  background: rgb(var(--v-theme-error));
  border: var(--v-upload-avatar-action-border) solid rgb(var(--v-theme-surface));
  transform: translate(var(--v-upload-avatar-action-offset), var(--v-upload-avatar-action-offset));
}

.va-avatar-upload__content {
  display: grid;
  flex: 1 1 auto;
  gap: var(--v-space-3);
  min-inline-size: 0;
}

.va-avatar-upload__content > div:first-child {
  display: grid;
  gap: var(--v-space-1);
}

.va-avatar-upload__content strong {
  font-size: var(--v-font-size-md);
  font-weight: var(--v-font-weight-semibold);
}

.va-avatar-upload__content p,
.va-avatar-upload__actions span {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}

.va-avatar-upload__actions {
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
}

.va-avatar-upload__error {
  color: rgb(var(--v-theme-error)) !important;
}

.va-avatar-upload__input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (max-width: 599px) {
  .va-avatar-upload {
    align-items: flex-start;
  }

  .va-avatar-upload__actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
