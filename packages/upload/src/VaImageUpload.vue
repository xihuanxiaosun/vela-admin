<script setup lang="ts" generic="TValue, TMetadata">
import { onBeforeUnmount, ref } from 'vue'

import { DEFAULT_IMAGE_ACCEPT } from './image'
import type { UploadQueue } from './upload-queue'
import type {
  ImageCropOptions,
  UploadBeforeRemove,
  UploadFilePreparer,
  UploadQueueItem,
} from './types'
import VaFileUpload from './VaFileUpload.vue'
import VaImageCropDialog from './VaImageCropDialog.vue'

const props = withDefaults(
  defineProps<{
    queue: UploadQueue<TValue, File, TMetadata>
    accept?: string
    maxFiles?: number
    disabled?: boolean
    readonly?: boolean
    capture?: 'user' | 'environment' | undefined
    reorderable?: boolean
    crop?: boolean
    cropOptions?: ImageCropOptions
    prepareFile?: UploadFilePreparer<File> | undefined
    beforeRemove?: UploadBeforeRemove<TValue, File, TMetadata> | undefined
    title?: string | undefined
    subtitle?: string | undefined
  }>(),
  {
    accept: DEFAULT_IMAGE_ACCEPT,
    maxFiles: 8,
    disabled: false,
    readonly: false,
    capture: undefined,
    reorderable: true,
    crop: false,
    cropOptions: () => ({ aspectRatio: 1, shape: 'rectangle' }),
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

const cropOpen = ref(false)
const cropFile = ref<File>()
let resolveCrop: ((file: File | undefined) => Promise<void>) | undefined
let rejectCrop: ((error: unknown) => void) | undefined

async function runHostPreparer(file: File): Promise<File | undefined> {
  return props.prepareFile ? props.prepareFile(file) : file
}

function prepareImage(file: File): Promise<File | undefined> {
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

function forwardAdded(files: readonly File[], ids: readonly string[]): void {
  emit('added', files, ids)
}

function forwardLimit(files: readonly File[], maximum: number): void {
  emit('limit-exceeded', files, maximum)
}

function forwardPrepareError(error: unknown, file: File): void {
  emit('prepare-error', error, file)
}

function forwardRemoved(item: UploadQueueItem<TValue, File, TMetadata>): void {
  emit('removed', item)
}

function forwardRemoveError(error: unknown, item: UploadQueueItem<TValue, File, TMetadata>): void {
  emit('remove-error', error, item)
}

onBeforeUnmount(cancelCrop)
</script>

<template>
  <VaFileUpload
    :accept="accept"
    :capture="capture"
    :before-remove="beforeRemove"
    :disabled="disabled"
    :max-files="maxFiles"
    :multiple="maxFiles !== 1"
    :prepare-file="prepareImage"
    presentation="gallery"
    :queue="queue"
    :readonly="readonly"
    :reorderable="reorderable"
    :subtitle="subtitle"
    :title="title"
    @added="forwardAdded"
    @limit-exceeded="forwardLimit"
    @prepare-error="forwardPrepareError"
    @preview="emit('preview', $event)"
    @remove-error="forwardRemoveError"
    @removed="forwardRemoved"
  />

  <VaImageCropDialog
    v-model="cropOpen"
    :file="cropFile"
    :options="cropOptions"
    @cancel="cancelCrop"
    @complete="finishCrop"
    @error="failCrop"
  />
</template>
