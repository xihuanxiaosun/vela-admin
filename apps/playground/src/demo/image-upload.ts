import type { NormalizedError, UploadAdapter } from '@vela-admin/contracts'
import type { VelaLocaleController } from '@vela-admin/locale'
import {
  allowedExtensions,
  allowedMimeTypes,
  createBrowserFilePreview,
  createUploadQueue,
  maxFileSize,
} from '@vela-admin/upload'

export interface DemoImageValue {
  readonly url: string
}

type Translate = VelaLocaleController['t']

function createDemoImageAdapter(t: Translate): UploadAdapter<DemoImageValue, File> {
  return {
    upload({ file, signal, onProgress }) {
      return new Promise((resolve, reject) => {
        let loaded = 0
        const total = Math.max(file.size, 1)
        const step = Math.max(1, Math.ceil(total / 12))
        const timer = window.setInterval(() => {
          if (file.name.toLocaleLowerCase().includes('fail') && loaded >= total / 2) {
            window.clearInterval(timer)
            reject(new Error(t('playground.upload.transportRejected')))
            return
          }
          loaded = Math.min(total, loaded + step)
          onProgress({ loaded, total })
          if (loaded >= total) {
            window.clearInterval(timer)
            resolve({
              value: { url: URL.createObjectURL(file) },
              fileName: file.name,
              size: file.size,
            })
          }
        }, 90)

        signal.addEventListener(
          'abort',
          () => {
            window.clearInterval(timer)
            reject(new DOMException(t('upload.status.cancelled'), 'AbortError'))
          },
          { once: true },
        )
      })
    },
    normalizeError(error): NormalizedError {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          kind: 'cancelled',
          message: t('upload.status.cancelled'),
          retryable: false,
          cause: error,
        }
      }
      return {
        kind: 'network',
        message: error instanceof Error ? error.message : t('upload.status.error'),
        retryable: true,
        cause: error,
      }
    },
  }
}

export function createDemoImageUploadQueue(t: Translate) {
  return createUploadQueue({
    adapter: createDemoImageAdapter(t),
    concurrency: 2,
    validators: [
      maxFileSize(8 * 1024 * 1024),
      allowedMimeTypes(['image/png', 'image/jpeg', 'image/webp']),
      allowedExtensions(['png', 'jpg', 'jpeg', 'webp']),
    ],
    preview: createBrowserFilePreview(),
  })
}
