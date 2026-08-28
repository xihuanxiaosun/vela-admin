<script setup lang="ts" generic="TValue, TMetadata">
import { computed, ref } from 'vue'
import {
  VAvatar,
  VFileUpload,
  VIcon,
  VImg,
  VList,
  VListItem,
  VListItemSubtitle,
  VListItemTitle,
  VProgressCircular,
  VProgressLinear,
} from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaIconButton, VaTag } from '@vela-admin/ui'

import { formatFileSize } from './format'
import { isImageFile } from './image'
import type { UploadQueue } from './upload-queue'
import type {
  UploadBeforeRemove,
  UploadFilePreparer,
  UploadPresentation,
  UploadQueueItem,
} from './types'
import VaImagePreviewDialog from './VaImagePreviewDialog.vue'

const props = withDefaults(
  defineProps<{
    queue: UploadQueue<TValue, File, TMetadata>
    accept?: string | undefined
    multiple?: boolean
    maxFiles?: number
    disabled?: boolean
    readonly?: boolean
    capture?: 'user' | 'environment' | undefined
    presentation?: UploadPresentation
    reorderable?: boolean
    previewable?: boolean
    prepareFile?: UploadFilePreparer<File> | undefined
    beforeRemove?: UploadBeforeRemove<TValue, File, TMetadata> | undefined
    title?: string | undefined
    subtitle?: string | undefined
    retryLabel?: string | undefined
    cancelLabel?: string | undefined
    removeLabel?: string | undefined
  }>(),
  {
    multiple: true,
    maxFiles: 0,
    disabled: false,
    readonly: false,
    capture: undefined,
    presentation: 'list',
    reorderable: false,
    previewable: true,
    prepareFile: undefined,
  },
)

const emit = defineEmits<{
  added: [files: readonly File[], ids: readonly string[]]
  'limit-exceeded': [files: readonly File[], maximum: number]
  'prepare-error': [error: unknown, file: File]
  removed: [item: UploadQueueItem<TValue, File, TMetadata>]
  'remove-error': [error: unknown, item: UploadQueueItem<TValue, File, TMetadata>]
  preview: [item: UploadQueueItem<TValue, File, TMetadata>]
}>()

const locale = useVelaLocale()
const selected = ref<File[]>([])
const preparing = ref(false)
const removingIds = ref<ReadonlySet<string>>(new Set())
const localMessage = ref<string>()
const previewItem = ref<UploadQueueItem<TValue, File, TMetadata>>()
const previewOpen = ref(false)
const resolvedTitle = computed(() => props.title ?? locale.t('upload.dropzone.title'))
const resolvedSubtitle = computed(() => props.subtitle ?? locale.t('upload.dropzone.subtitle'))
const maximum = computed(() => {
  if (!props.multiple) return 1
  return props.maxFiles > 0 ? Math.max(1, Math.floor(props.maxFiles)) : Number.POSITIVE_INFINITY
})
const remaining = computed(() => Math.max(0, maximum.value - props.queue.items.value.length))
const atCapacity = computed(() => Number.isFinite(maximum.value) && remaining.value === 0)
const locked = computed(() => props.disabled || props.readonly)
const capacityLabel = computed(() =>
  Number.isFinite(maximum.value)
    ? locale.t('upload.count', { count: props.queue.items.value.length, maximum: maximum.value })
    : undefined,
)

function statusLabel(status: string): string {
  return locale.t(`upload.status.${status}`)
}

function statusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'success') return 'success'
  if (status === 'error') return 'danger'
  if (status === 'cancelled') return 'warning'
  return 'neutral'
}

function normalizeSelection(value: File | readonly File[] | null): readonly File[] {
  if (!value) return []
  return value instanceof File ? [value] : value
}

async function addFiles(value: File | readonly File[] | null): Promise<void> {
  const files = normalizeSelection(value)
  if (files.length === 0) return
  localMessage.value = undefined
  const accepted = files.slice(0, remaining.value)
  const rejected = files.slice(accepted.length)
  if (rejected.length > 0) {
    localMessage.value = locale.t('upload.error.limit', { count: maximum.value })
    emit('limit-exceeded', rejected, maximum.value)
  }

  preparing.value = true
  const prepared: File[] = []
  try {
    for (const file of accepted) {
      try {
        const next = props.prepareFile ? await props.prepareFile(file) : file
        if (next) prepared.push(next)
      } catch (error) {
        localMessage.value = locale.t('upload.error.prepare')
        emit('prepare-error', error, file)
      }
    }
    if (prepared.length > 0) {
      const ids = props.queue.add(prepared)
      emit('added', prepared, ids)
    }
  } finally {
    preparing.value = false
    selected.value = []
  }
}

function openPreview(item: UploadQueueItem<TValue, File, TMetadata>): void {
  emit('preview', item)
  if (!props.previewable || !item.previewUrl || !isImageFile(item.file)) return
  previewItem.value = item
  previewOpen.value = true
}

function setRemoving(id: string, removing: boolean): void {
  const next = new Set(removingIds.value)
  if (removing) next.add(id)
  else next.delete(id)
  removingIds.value = next
}

async function removeItem(item: UploadQueueItem<TValue, File, TMetadata>): Promise<void> {
  if (props.disabled || removingIds.value.has(item.id)) return
  localMessage.value = undefined
  setRemoving(item.id, true)
  try {
    const allowed = props.beforeRemove
      ? await props.beforeRemove({ item, ...(item.previewUrl ? { url: item.previewUrl } : {}) })
      : true
    if (!allowed) return
    props.queue.remove(item.id)
    emit('removed', item)
  } catch (error) {
    localMessage.value = locale.t('upload.error.remove')
    emit('remove-error', error, item)
  } finally {
    setRemoving(item.id, false)
  }
}
</script>

<template>
  <div class="va-file-upload" :class="`va-file-upload--${presentation}`">
    <div class="va-file-upload__dropzone-wrap">
      <VFileUpload
        v-model="selected"
        :accept="accept"
        :aria-label="resolvedTitle"
        :capture="capture"
        clearable
        :disabled="locked || preparing || atCapacity"
        :multiple="multiple"
        show-size
        :subtitle="atCapacity ? locale.t('upload.dropzone.full') : resolvedSubtitle"
        :title="resolvedTitle"
        @update:model-value="addFiles"
      />
      <div v-if="preparing" class="va-file-upload__preparing" role="status">
        <VProgressCircular indeterminate size="24" width="2" />
        <span>{{ locale.t('upload.status.preparing') }}</span>
      </div>
      <span v-if="capacityLabel" class="va-file-upload__capacity">{{ capacityLabel }}</span>
    </div>

    <p v-if="localMessage" class="va-file-upload__message" role="alert">{{ localMessage }}</p>

    <div v-if="queue.items.value.length && presentation === 'gallery'" class="va-file-upload__grid">
      <article
        v-for="(item, index) in queue.items.value"
        :key="item.id"
        class="va-file-upload__tile"
        :class="`va-file-upload__tile--${item.status}`"
      >
        <button
          class="va-file-upload__preview-button"
          :disabled="!item.previewUrl || !previewable"
          type="button"
          @click="openPreview(item)"
        >
          <VImg v-if="item.previewUrl" :alt="item.file.name" cover :src="item.previewUrl" />
          <VIcon v-else icon="$file" />
          <span class="va-file-upload__preview-affordance">
            <VIcon icon="$view" />
            {{ locale.t('upload.action.preview') }}
          </span>
        </button>

        <VProgressLinear
          v-if="item.status === 'uploading' || item.status === 'validating'"
          class="va-file-upload__tile-progress"
          color="primary"
          :indeterminate="item.progress.percentage === undefined"
          :model-value="item.progress.percentage ?? 0"
        />

        <div class="va-file-upload__tile-content">
          <div class="va-file-upload__tile-heading">
            <strong :title="item.file.name">{{ item.file.name }}</strong>
            <VaTag :tone="statusTone(item.status)">{{ statusLabel(item.status) }}</VaTag>
          </div>
          <span>{{ formatFileSize(item.file.size) }}</span>
          <span v-if="item.error" class="va-file-upload__error">{{ item.error.message }}</span>
          <div class="va-file-upload__tile-actions">
            <template v-if="!readonly && reorderable && queue.items.value.length > 1">
              <VaIconButton
                :disabled="disabled || index === 0"
                icon="$arrowUp"
                :label="locale.t('upload.action.moveEarlier')"
                @click="queue.move(item.id, index - 1)"
              />
              <VaIconButton
                :disabled="disabled || index === queue.items.value.length - 1"
                icon="$arrowDown"
                :label="locale.t('upload.action.moveLater')"
                @click="queue.move(item.id, index + 1)"
              />
            </template>
            <VaIconButton
              v-if="!readonly && (item.status === 'error' || item.status === 'cancelled')"
              :disabled="disabled"
              icon="$refresh"
              :label="retryLabel ?? locale.t('upload.action.retry')"
              @click="queue.retry(item.id)"
            />
            <VaIconButton
              v-if="!readonly && ['uploading', 'validating', 'queued'].includes(item.status)"
              :disabled="disabled"
              icon="$cancel"
              :label="cancelLabel ?? locale.t('upload.action.cancel')"
              @click="queue.cancel(item.id)"
            />
            <VaIconButton
              v-else-if="!readonly"
              :disabled="disabled || removingIds.has(item.id)"
              icon="$delete"
              intent="danger"
              :label="removeLabel ?? locale.t('upload.action.remove')"
              :loading="removingIds.has(item.id)"
              @click="removeItem(item)"
            />
          </div>
        </div>
      </article>
    </div>

    <VList v-else-if="queue.items.value.length" class="va-file-upload__list" lines="two">
      <VListItem v-for="item in queue.items.value" :key="item.id" class="va-file-upload__item">
        <template #prepend>
          <button
            class="va-file-upload__list-preview"
            :disabled="!item.previewUrl || !previewable"
            type="button"
            @click="openPreview(item)"
          >
            <VAvatar rounded="lg" size="48">
              <VImg v-if="item.previewUrl" :alt="item.file.name" cover :src="item.previewUrl" />
              <VIcon v-else icon="$file" />
            </VAvatar>
          </button>
        </template>
        <VListItemTitle class="va-file-upload__name">{{ item.file.name }}</VListItemTitle>
        <VListItemSubtitle>
          {{ formatFileSize(item.file.size) }}
          <span v-if="item.error" class="va-file-upload__error"> · {{ item.error.message }}</span>
        </VListItemSubtitle>
        <VProgressLinear
          v-if="item.status === 'uploading' || item.status === 'validating'"
          class="va-file-upload__progress"
          color="primary"
          :indeterminate="item.progress.percentage === undefined"
          :model-value="item.progress.percentage ?? 0"
        />
        <template #append>
          <div class="va-file-upload__list-actions">
            <VaTag :tone="statusTone(item.status)">{{ statusLabel(item.status) }}</VaTag>
            <VaIconButton
              v-if="!readonly && (item.status === 'error' || item.status === 'cancelled')"
              :disabled="disabled"
              icon="$refresh"
              :label="retryLabel ?? locale.t('upload.action.retry')"
              @click="queue.retry(item.id)"
            />
            <VaIconButton
              v-if="!readonly && ['uploading', 'validating', 'queued'].includes(item.status)"
              :disabled="disabled"
              icon="$cancel"
              :label="cancelLabel ?? locale.t('upload.action.cancel')"
              @click="queue.cancel(item.id)"
            />
            <VaIconButton
              v-else-if="!readonly"
              :disabled="disabled || removingIds.has(item.id)"
              icon="$delete"
              intent="danger"
              :label="removeLabel ?? locale.t('upload.action.remove')"
              :loading="removingIds.has(item.id)"
              @click="removeItem(item)"
            />
          </div>
        </template>
      </VListItem>
    </VList>

    <VaImagePreviewDialog
      v-model="previewOpen"
      :alt="previewItem?.file.name"
      :src="previewItem?.previewUrl"
      :title="previewItem?.file.name"
    />
  </div>
</template>

<style>
.va-file-upload {
  display: grid;
  gap: var(--v-space-4);
}

.va-file-upload__dropzone-wrap {
  position: relative;
}

.va-file-upload .v-file-upload {
  min-block-size: var(--v-upload-dropzone-min-height);
  padding: var(--v-space-5);
  color: rgb(var(--v-theme-on-surface));
  background:
    radial-gradient(
      circle at 50% 0%,
      rgba(var(--v-theme-primary), var(--v-upload-dropzone-glow-opacity)),
      transparent 52%
    ),
    rgba(var(--v-theme-surface), var(--v-runtime-surface-opacity));
  border: 1px dashed rgba(var(--v-theme-primary), var(--v-upload-dropzone-border-opacity));
  border-radius: var(--v-radius-xl);
  transition:
    border-color var(--v-motion-duration-standard) var(--v-motion-easing-standard),
    box-shadow var(--v-motion-duration-standard) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-standard) var(--v-motion-easing-emphasized);
}

.va-file-upload .v-file-upload:hover:not(.v-input--disabled),
.va-file-upload .v-file-upload:focus-within {
  border-color: rgba(var(--v-theme-primary), var(--v-high-emphasis-opacity));
  box-shadow: var(--v-upload-dropzone-focus-shadow);
  transform: translateY(var(--v-upload-hover-offset));
}

.va-file-upload .v-file-upload .v-icon {
  color: rgb(var(--v-theme-primary));
}

.va-file-upload__capacity {
  position: absolute;
  inset-block-start: var(--v-space-3);
  inset-inline-end: var(--v-space-3);
  padding: var(--v-space-1) var(--v-space-2);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
  font-variant-numeric: tabular-nums;
  background: rgba(var(--v-theme-surface), var(--v-surface-opacity-strong));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-pill);
  backdrop-filter: blur(var(--v-upload-backdrop-blur));
}

.va-file-upload__preparing {
  position: absolute;
  z-index: var(--v-z-sticky);
  inset: 0;
  display: flex;
  gap: var(--v-space-3);
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-primary));
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-semibold);
  background: rgba(var(--v-theme-surface), var(--v-upload-preparing-opacity));
  border-radius: var(--v-radius-xl);
  backdrop-filter: blur(var(--v-upload-backdrop-blur));
}

.va-file-upload__message {
  margin: calc(var(--v-space-2) * -1) 0 0;
  color: rgb(var(--v-theme-error));
  font-size: var(--v-font-size-xs);
}

.va-file-upload__list {
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-upload-list-shadow);
}

.va-file-upload__item + .va-file-upload__item {
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.va-file-upload__name,
.va-file-upload__tile-heading strong {
  overflow: hidden;
  font-size: var(--v-font-size-sm);
  font-weight: var(--v-font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.va-file-upload__progress {
  margin-block-start: var(--v-space-2);
}

.va-file-upload__list-preview,
.va-file-upload__preview-button {
  padding: 0;
  color: inherit;
  cursor: zoom-in;
  background: none;
  border: 0;
}

.va-file-upload__list-preview:disabled,
.va-file-upload__preview-button:disabled {
  cursor: default;
}

.va-file-upload__list-actions,
.va-file-upload__tile-actions {
  display: inline-flex;
  gap: var(--v-space-1);
  align-items: center;
}

.va-file-upload__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--v-upload-gallery-min-width), 1fr));
  gap: var(--v-space-4);
}

.va-file-upload__tile {
  position: relative;
  min-inline-size: 0;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: var(--v-radius-xl);
  box-shadow: var(--v-upload-tile-shadow);
  transition:
    border-color var(--v-motion-duration-standard) var(--v-motion-easing-standard),
    box-shadow var(--v-motion-duration-standard) var(--v-motion-easing-standard),
    transform var(--v-motion-duration-standard) var(--v-motion-easing-emphasized);
}

.va-file-upload__tile:hover {
  border-color: rgba(var(--v-theme-primary), var(--v-upload-tile-hover-border-opacity));
  box-shadow: var(--v-upload-tile-hover-shadow);
  transform: translateY(var(--v-upload-hover-offset));
}

.va-file-upload__tile--error {
  border-color: rgba(var(--v-theme-error), var(--v-upload-error-border-opacity));
}

.va-file-upload__preview-button {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: var(--v-upload-gallery-preview-height);
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface-variant));
  background: rgb(var(--v-theme-surface-light));
}

.va-file-upload__preview-button .v-img {
  inline-size: 100%;
  block-size: 100%;
  transition: transform var(--v-motion-duration-slow) var(--v-motion-easing-emphasized);
}

.va-file-upload__preview-affordance {
  position: absolute;
  inset: 0;
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-on-primary));
  font-size: var(--v-font-size-xs);
  font-weight: var(--v-font-weight-semibold);
  background: rgba(var(--v-theme-primary), var(--v-upload-preview-overlay-opacity));
  opacity: 0;
  transition: opacity var(--v-motion-duration-standard) var(--v-motion-easing-standard);
}

.va-file-upload__preview-button:hover .v-img,
.va-file-upload__preview-button:focus-visible .v-img {
  transform: scale(var(--v-upload-preview-hover-scale));
}

.va-file-upload__preview-button:hover .va-file-upload__preview-affordance,
.va-file-upload__preview-button:focus-visible .va-file-upload__preview-affordance {
  opacity: 1;
}

.va-file-upload__tile-progress {
  position: absolute;
  z-index: var(--v-z-sticky);
  inset-block-start: calc(var(--v-upload-gallery-preview-height) - var(--v-upload-progress-height));
}

.va-file-upload__tile-content {
  display: grid;
  gap: var(--v-space-1);
  padding: var(--v-space-3);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: var(--v-font-size-xs);
}

.va-file-upload__tile-heading {
  display: flex;
  gap: var(--v-space-2);
  align-items: center;
  justify-content: space-between;
  min-inline-size: 0;
}

.va-file-upload__tile-heading strong {
  color: rgb(var(--v-theme-on-surface));
}

.va-file-upload__tile-actions {
  justify-content: flex-end;
  margin-block-start: var(--v-space-1);
}

.va-file-upload__error {
  color: rgb(var(--v-theme-error));
}

@media (max-width: 599px) {
  .va-file-upload__list-actions > .va-tag {
    display: none;
  }

  .va-file-upload__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--v-space-3);
  }
}
</style>
