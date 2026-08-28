<script setup lang="ts">
import { ref } from 'vue'
import { VCard, VCardText, VCardTitle } from 'vuetify/components'
import { useVelaLocale } from '@vela-admin/locale'
import { VaAvatarUpload, VaImageUpload } from '@vela-admin/upload'
import type { UploadRemoveContext } from '@vela-admin/upload'
import { VaTag } from '@vela-admin/ui'

import { createDemoImageUploadQueue, type DemoImageValue } from '../demo/image-upload'

const locale = useVelaLocale()
const avatarQueue = createDemoImageUploadQueue(locale.t)
const galleryQueue = createDemoImageUploadQueue(locale.t)
const coverQueue = createDemoImageUploadQueue(locale.t)
const avatar = ref<string>()

function placeholderImage(color: string): string {
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="${color}"/><circle cx="800" cy="110" r="180" fill="white" fill-opacity=".12"/><path d="M72 480h520v20H72zm0 48h380v12H72z" fill="white" fill-opacity=".82"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(source)}`
}

galleryQueue.seed([
  {
    id: 'existing-product-cover',
    name: 'existing-cover.svg',
    url: placeholderImage('#6740C4'),
    type: 'image/svg+xml',
    result: { value: { url: '/media/existing-product-cover.svg' } },
  },
  {
    id: 'existing-detail-image',
    name: 'existing-detail.svg',
    url: placeholderImage('#2563EB'),
    type: 'image/svg+xml',
    result: { value: { url: '/media/existing-detail-image.svg' } },
  },
])

function resolveImage(value: DemoImageValue): string {
  return value.url
}

async function confirmRemoteRemoval(
  context: UploadRemoveContext<DemoImageValue, File>,
): Promise<boolean> {
  if (context.item?.source !== 'remote') return true
  await new Promise((resolve) => setTimeout(resolve, 480))
  return true
}
</script>

<template>
  <div class="playground-stack">
    <div class="playground-page-heading">
      <div>
        <p class="playground-eyebrow">{{ locale.t('playground.upload.eyebrow') }}</p>
        <h1>{{ locale.t('playground.upload.title') }}</h1>
        <p>{{ locale.t('playground.upload.description') }}</p>
      </div>
    </div>

    <div class="playground-upload-grid">
      <VCard class="playground-panel playground-upload-card">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.upload.avatar') }}</strong
            ><span>{{ locale.t('playground.upload.avatarDescription') }}</span>
          </div>
          <VaTag icon="$crop" tone="primary">
            {{ locale.t('playground.upload.cropEnabled') }}
          </VaTag>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <VaAvatarUpload
            v-model="avatar"
            name="Maya Chen"
            :queue="avatarQueue"
            :resolve-url="resolveImage"
          />
        </VCardText>
      </VCard>

      <VCard class="playground-panel playground-upload-card">
        <VCardTitle class="playground-panel__header">
          <div>
            <strong>{{ locale.t('playground.upload.cover') }}</strong
            ><span>{{ locale.t('playground.upload.coverDescription') }}</span>
          </div>
          <VaTag icon="$image" tone="info">{{ locale.t('playground.upload.editorial') }}</VaTag>
        </VCardTitle>
        <VCardText class="playground-panel__body">
          <VaImageUpload
            crop
            :crop-options="{
              aspectRatio: 16 / 9,
              outputWidth: 1600,
              outputHeight: 900,
              mimeType: 'image/webp',
              quality: 0.9,
            }"
            :max-files="1"
            :queue="coverQueue"
            :subtitle="locale.t('playground.upload.coverSubtitle')"
            :title="locale.t('playground.upload.coverTitle')"
          />
        </VCardText>
      </VCard>
    </div>

    <VCard class="playground-panel playground-upload-card">
      <VCardTitle class="playground-panel__header">
        <div>
          <strong>{{ locale.t('playground.upload.gallery') }}</strong
          ><span>{{ locale.t('playground.upload.galleryDescription') }}</span>
        </div>
        <div class="playground-component-row">
          <VaTag tone="info">
            {{
              locale.t('playground.upload.activeCount', {
                count: galleryQueue.activeCount.value,
              })
            }}
          </VaTag>
          <VaTag tone="neutral">
            {{
              locale.t('playground.upload.completeCount', {
                count: galleryQueue.completedCount.value,
              })
            }}
          </VaTag>
        </div>
      </VCardTitle>
      <VCardText class="playground-panel__body">
        <VaImageUpload
          :before-remove="confirmRemoteRemoval"
          :max-files="8"
          :queue="galleryQueue"
          :subtitle="locale.t('playground.upload.gallerySubtitle')"
          :title="locale.t('playground.upload.galleryTitle')"
        />
      </VCardText>
    </VCard>
  </div>
</template>

<style>
.playground-upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--v-space-6);
  align-items: start;
}

@media (max-width: 959px) {
  .playground-upload-grid {
    grid-template-columns: 1fr;
  }
}
</style>
