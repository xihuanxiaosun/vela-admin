import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { NormalizedError, UploadAdapter, UploadFileLike } from '@vela-admin/contracts'
import { createVelaLocale } from '@vela-admin/locale'

import {
  allowedExtensions,
  allowedMimeTypes,
  canvasToFile,
  createBrowserFilePreview,
  createBrowserPreviewAdapter,
  createUploadQueue,
  createUploadValidators,
  formatFileSize,
  isImageFile,
  imageDimensions,
  inspectImageDimensions,
  maxFileSize,
  resolveCommonUploadUrl,
} from './index'

interface Result {
  url: string
}

const image: UploadFileLike = { name: 'avatar.png', size: 50, type: 'image/png' }

async function flushQueue(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('upload queue', () => {
  it('validates, uploads with progress, and drains', async () => {
    const upload = vi.fn<UploadAdapter<Result, UploadFileLike>['upload']>(
      ({ file, onProgress }) => {
        onProgress({ loaded: file.size, total: file.size })
        return Promise.resolve({ value: { url: `/files/${file.name}` } })
      },
    )
    const adapter: UploadAdapter<Result, UploadFileLike> = {
      upload,
    }
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({
        adapter,
        validators: [maxFileSize(100)],
        createId: () => 'file-1',
      }),
    )
    if (!queue) throw new Error('Expected upload queue')
    queue.add([{ name: 'avatar.png', size: 50, type: 'image/png' }])
    await queue.drain()

    expect(queue.items.value[0]).toMatchObject({
      source: 'local',
      status: 'success',
      progress: { percentage: 100 },
      result: { value: { url: '/files/avatar.png' } },
    })
    scope.stop()
  })

  it('reports validation errors without calling the adapter', async () => {
    const upload = vi.fn<UploadAdapter<unknown, UploadFileLike>['upload']>()
    const adapter: UploadAdapter<unknown, UploadFileLike> = {
      upload,
    }
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({ adapter, validators: [maxFileSize(10)], createId: () => 'large' }),
    )
    if (!queue) throw new Error('Expected upload queue')
    queue.add([{ name: 'large.zip', size: 20, type: 'application/zip' }])
    await queue.drain()
    expect(queue.items.value[0]?.status).toBe('error')
    expect(upload).not.toHaveBeenCalled()
    scope.stop()
  })

  it('supports localized validator factories without coupling the queue to Vue injection', async () => {
    const locale = createVelaLocale({
      locale: 'test',
      root: null,
      messages: { test: { 'upload.error.maxSize': 'Maximum {bytes} bytes' } },
    })
    const validators = createUploadValidators(locale)
    const result = await validators.maxFileSize<UploadFileLike>(8)({
      name: 'large.bin',
      size: 9,
      type: 'application/octet-stream',
    })

    expect(result?.message).toBe('Maximum 8 bytes')
  })

  it('can be paused, started, retried, and cleared without losing metadata', async () => {
    let attempt = 0
    const adapter: UploadAdapter<Result, UploadFileLike, { folder: string }> = {
      upload: ({ file }) => {
        attempt += 1
        return attempt === 1
          ? Promise.reject(new Error('temporary'))
          : Promise.resolve({ value: { url: `/files/${file.name}` } })
      },
      normalizeError: (cause): NormalizedError => ({
        kind: 'network',
        message: cause instanceof Error ? cause.message : 'failed',
        retryable: true,
        cause,
      }),
    }
    const revoke = vi.fn()
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({
        adapter,
        autoStart: false,
        createId: () => 'paused-file',
        preview: { create: () => 'blob:preview', revoke },
      }),
    )
    if (!queue) throw new Error('Expected upload queue')

    queue.add([image], { folder: 'avatars' })
    await flushQueue()
    expect(queue.items.value[0]).toMatchObject({
      status: 'queued',
      metadata: { folder: 'avatars' },
      previewUrl: 'blob:preview',
    })
    queue.pause()
    queue.start()
    await queue.drain()
    expect(queue.items.value[0]).toMatchObject({ status: 'error', attempts: 1 })

    queue.retry('paused-file')
    await queue.drain()
    expect(queue.items.value[0]).toMatchObject({ status: 'success', attempts: 2 })
    expect(queue.completedCount.value).toBe(1)
    queue.clearCompleted()
    expect(queue.items.value).toEqual([])
    expect(revoke).toHaveBeenCalledWith('blob:preview')
    scope.stop()
  })

  it('reorders queued items without recreating previews or changing item state', () => {
    let id = 0
    const revoke = vi.fn()
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({
        adapter: { upload: () => Promise.resolve({ value: undefined }) },
        autoStart: false,
        createId: () => `image-${++id}`,
        preview: { create: (file) => `blob:${file.name}`, revoke },
      }),
    )
    if (!queue) throw new Error('Expected upload queue')
    queue.add([image, { ...image, name: 'cover.png' }, { ...image, name: 'detail.png' }])

    queue.move('image-3', 0)
    expect(queue.items.value.map((item) => item.file.name)).toEqual([
      'detail.png',
      'avatar.png',
      'cover.png',
    ])
    expect(queue.items.value.every((item) => item.status === 'queued')).toBe(true)
    expect(revoke).not.toHaveBeenCalled()
    scope.stop()
  })

  it('seeds existing remote assets into the ordered queue without uploading or revoking URLs', () => {
    const upload = vi.fn(() => Promise.resolve({ value: { url: '/new.png' } }))
    const revoke = vi.fn()
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({
        adapter: { upload },
        autoStart: false,
        createId: () => 'generated-id',
        preview: { create: () => undefined, revoke },
      }),
    )
    if (!queue) throw new Error('Expected upload queue')

    expect(
      queue.seed([
        {
          id: 'remote-cover',
          name: 'cover.webp',
          url: 'https://cdn.example.dev/cover.webp',
          size: 2048,
          type: 'image/webp',
          result: { value: { url: '/cover.webp' } },
        },
      ]),
    ).toEqual(['remote-cover'])
    expect(queue.items.value[0]).toMatchObject({
      source: 'remote',
      status: 'success',
      previewUrl: 'https://cdn.example.dev/cover.webp',
      progress: { loaded: 2048, total: 2048, percentage: 100 },
    })
    expect(upload).not.toHaveBeenCalled()
    expect(() =>
      queue.seed([
        { id: 'remote-cover', name: 'duplicate.webp', url: 'https://cdn.example.dev/2.webp' },
      ]),
    ).toThrow('Duplicate upload queue item id')

    queue.remove('remote-cover')
    expect(revoke).not.toHaveBeenCalled()
    scope.stop()
  })

  it('auto-retries retryable failures and clamps progress values', async () => {
    let attempt = 0
    let complete!: (value: { value: Result }) => void
    const finalAttempt = new Promise<{ value: Result }>((resolve) => {
      complete = resolve
    })
    const adapter: UploadAdapter<Result, UploadFileLike> = {
      upload: ({ onProgress }) => {
        attempt += 1
        if (attempt === 1) return Promise.reject(new Error('try again'))
        onProgress({ loaded: -10, total: -5, percentage: 140 })
        return finalAttempt
      },
    }
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({ adapter, autoRetry: 1, concurrency: 0, createId: () => 'retry-file' }),
    )
    if (!queue) throw new Error('Expected upload queue')
    queue.add([image])
    await flushQueue()
    await flushQueue()

    expect(queue.items.value[0]).toMatchObject({
      status: 'uploading',
      attempts: 2,
      progress: { loaded: 0, total: 0, percentage: 100 },
    })
    complete({ value: { url: '/files/avatar.png' } })
    await queue.drain()
    expect(queue.items.value[0]?.status).toBe('success')
    scope.stop()
  })

  it('cancels active work, removes queued work, and revokes previews on dispose', async () => {
    const adapter: UploadAdapter<Result, UploadFileLike> = {
      upload: ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('stop', 'AbortError')))
        }),
    }
    const revoke = vi.fn()
    let id = 0
    const scope = effectScope()
    const queue = scope.run(() =>
      createUploadQueue({
        adapter,
        concurrency: 1,
        createId: () => `file-${++id}`,
        preview: { create: (file) => `blob:${file.name}`, revoke },
      }),
    )
    if (!queue) throw new Error('Expected upload queue')
    queue.add([image, { ...image, name: 'second.png' }])
    await flushQueue()
    expect(queue.activeCount.value).toBe(1)
    expect(queue.pendingCount.value).toBe(2)

    queue.remove('file-2')
    expect(revoke).toHaveBeenCalledWith('blob:second.png')
    queue.cancel('file-1')
    await queue.drain()
    expect(queue.items.value[0]?.status).toBe('cancelled')

    queue.dispose()
    queue.dispose()
    expect(queue.items.value).toEqual([])
    expect(revoke).toHaveBeenCalledWith('blob:avatar.png')
    expect(() => queue.add([image])).toThrow('disposed')
    scope.stop()
  })

  it('supports a custom cancellation message and non-error failure values', async () => {
    const cancelledAdapter: UploadAdapter<unknown, UploadFileLike> = {
      upload: () => Promise.reject(new DOMException('stop', 'AbortError')),
    }
    const failedAdapter: UploadAdapter<unknown, UploadFileLike> = {
      // Deliberately verifies normalization of a non-Error rejection from an external adapter.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      upload: () => Promise.reject('unknown'),
    }
    const firstScope = effectScope()
    const cancelled = firstScope.run(() =>
      createUploadQueue({
        adapter: cancelledAdapter,
        createId: () => 'cancelled',
        messages: { cancelled: 'Stopped by user' },
      }),
    )
    if (!cancelled) throw new Error('Expected upload queue')
    cancelled.add([image])
    await cancelled.drain()
    expect(cancelled.items.value[0]?.error?.message).toBe('Stopped by user')
    firstScope.stop()

    const secondScope = effectScope()
    const failed = secondScope.run(() =>
      createUploadQueue({
        adapter: failedAdapter,
        createId: () => 'failed',
        messages: { failed: 'Could not upload' },
      }),
    )
    if (!failed) throw new Error('Expected upload queue')
    failed.add([image])
    await failed.drain()
    expect(failed.items.value[0]?.error?.message).toBe('Could not upload')
    secondScope.stop()
  })
})

describe('upload validation and previews', () => {
  it('accepts matching MIME types and normalized extensions and rejects mismatches', async () => {
    const mime = allowedMimeTypes<UploadFileLike>(['IMAGE/PNG'])
    const extension = allowedExtensions<UploadFileLike>(['png', '.jpg'])

    expect(await mime(image)).toBeUndefined()
    expect((await mime({ ...image, type: 'text/plain' }))?.code).toBe('upload.type-not-allowed')
    expect(await extension({ ...image, name: 'PHOTO.JPG' })).toBeUndefined()
    expect((await extension({ ...image, name: 'README' }))?.code).toBe(
      'upload.extension-not-allowed',
    )
    expect((await maxFileSize<UploadFileLike>(49, 'Too large')(image))?.message).toBe('Too large')
  })

  it('creates and revokes browser previews only for previewable files', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:avatar')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const preview = createBrowserFilePreview<File>()
    const browser = createBrowserPreviewAdapter()
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const text = new File(['text'], 'notes.txt', { type: 'text/plain' })

    expect(preview.create(file)).toBe('blob:avatar')
    expect(preview.create(text)).toBeUndefined()
    expect(browser.create(file)).toBe('blob:avatar')
    expect(browser.create(text)).toBeUndefined()
    preview.revoke('blob:avatar')
    browser.revoke('blob:avatar')
    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('allows applications to override preview eligibility', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document')
    const preview = createBrowserFilePreview<File>({ canPreview: () => true })
    const file = new File(['document'], 'guide.pdf', { type: 'application/pdf' })

    expect(preview.create(file)).toBe('blob:document')
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it('recognizes image files and resolves common result envelopes conservatively', () => {
    expect(isImageFile(new File(['image'], 'photo.webp', { type: 'image/webp' }))).toBe(true)
    expect(isImageFile(new File(['text'], 'notes.txt', { type: 'text/plain' }))).toBe(false)
    expect(resolveCommonUploadUrl('/assets/avatar.webp')).toBe('/assets/avatar.webp')
    expect(resolveCommonUploadUrl({ url: '/assets/cover.webp' })).toBe('/assets/cover.webp')
    expect(resolveCommonUploadUrl({ path: '/assets/cover.webp' })).toBeUndefined()
  })

  it('validates decoded image dimensions, aspect ratio, and total pixels', async () => {
    const file = new File(['image'], 'cover.png', { type: 'image/png' })
    const inspect = vi.fn().mockResolvedValue({ width: 1600, height: 900 })
    const cover = imageDimensions({ minWidth: 1200, aspectRatio: 16 / 9, inspect })
    const square = imageDimensions({ aspectRatio: 1, maxPixels: 1_000_000, inspect })

    expect(await cover(file)).toBeUndefined()
    expect((await square(file))?.code).toBe('upload.image-dimensions')
    expect(inspect).toHaveBeenCalledWith(file)
  })

  it('covers each decoded dimension boundary and unreadable image failures', async () => {
    const file = new File(['image'], 'cover.png', { type: 'image/png' })
    const inspect = vi.fn().mockResolvedValue({ width: 800, height: 600 })
    const rules = imageDimensions({
      minWidth: 801,
      maxWidth: 799,
      minHeight: 601,
      maxHeight: 599,
      maxPixels: 479_999,
      inspect,
    })
    expect((await rules(file))?.code).toBe('upload.image-dimensions')

    const unreadable = imageDimensions({
      inspect: () => Promise.reject(new Error('bad bytes')),
    })
    const error = await unreadable(file)
    expect(error).toMatchObject({ code: 'upload.image-unreadable', retryable: false })
    expect(error?.cause).toBeInstanceOf(Error)
  })

  it('decodes browser image dimensions and always releases the bitmap', async () => {
    const close = vi.fn()
    const create = vi.fn().mockResolvedValue({ width: 1440, height: 900, close })
    vi.stubGlobal('createImageBitmap', create)
    const file = new File(['image'], 'banner.png', { type: 'image/png' })

    await expect(inspectImageDimensions(file)).resolves.toEqual({ width: 1440, height: 900 })
    expect(create).toHaveBeenCalledWith(file)
    expect(close).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('encodes cropped canvases with stable names and rejects empty encoders', async () => {
    const source = new File(['source'], 'hero.jpeg', { type: 'image/jpeg' })
    const canvas = {
      toBlob: (callback: BlobCallback, type?: string) =>
        callback(new Blob(['crop'], { type: type ?? 'image/png' })),
    } as HTMLCanvasElement
    const result = await canvasToFile(canvas, source, {
      mimeType: 'image/webp',
      quality: 2,
    })
    expect(result).toMatchObject({ name: 'hero-cropped.webp', type: 'image/webp' })

    const empty = { toBlob: (callback: BlobCallback) => callback(null) } as HTMLCanvasElement
    await expect(canvasToFile(empty, source)).rejects.toThrow('could not encode')
  })
})

describe('file size formatting', () => {
  it('formats representative byte sizes', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536, 'en')).toBe('1.5 KB')
    expect(formatFileSize(-10)).toBe('—')
    expect(formatFileSize(1024 ** 4, 'en')).toBe('1 TB')
  })
})
