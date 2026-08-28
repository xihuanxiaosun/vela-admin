import type {
  Awaitable,
  NormalizedError,
  UploadFileLike,
  UploadProgress,
  UploadResult,
} from '@vela-admin/contracts'

export type UploadStatus = 'queued' | 'validating' | 'uploading' | 'success' | 'error' | 'cancelled'

export interface UploadQueueItem<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
> {
  readonly id: string
  readonly source: 'local' | 'remote'
  readonly file: TFile | UploadFileLike
  readonly metadata?: TMetadata | undefined
  readonly status: UploadStatus
  readonly progress: UploadProgress
  readonly attempts: number
  readonly previewUrl?: string | undefined
  readonly result?: UploadResult<TValue> | undefined
  readonly error?: NormalizedError | undefined
}

/** A server-backed asset inserted into the same ordered queue as new local uploads. */
export interface UploadRemoteAsset<TValue = unknown, TMetadata = unknown> {
  readonly id?: string
  readonly name: string
  readonly url: string
  readonly size?: number
  readonly type?: string
  readonly metadata?: TMetadata
  readonly result?: UploadResult<TValue>
}

export interface UploadRemoveContext<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
> {
  readonly item?: UploadQueueItem<TValue, TFile, TMetadata>
  readonly url?: string
}

/** Return false to retain the asset; reject to surface an actionable removal error. */
export type UploadBeforeRemove<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
> = (context: UploadRemoveContext<TValue, TFile, TMetadata>) => Awaitable<boolean>

export type UploadValidator<TFile extends UploadFileLike = UploadFileLike> = (
  file: TFile,
) => NormalizedError | undefined | Promise<NormalizedError | undefined>

/** Stable visual modes for the generic upload surface. */
export type UploadPresentation = 'list' | 'gallery'

/**
 * Optional pre-upload pipeline. Return `undefined` when the user cancels editing. This is the
 * extension point for cropping, compression, EXIF normalization, watermarking, or encryption.
 */
export type UploadFilePreparer<TFile extends UploadFileLike = UploadFileLike> = (
  file: TFile,
) => TFile | undefined | Promise<TFile | undefined>

export type ImageCropShape = 'rectangle' | 'circle'

export interface ImageCropOptions {
  readonly aspectRatio?: number
  readonly shape?: ImageCropShape
  readonly outputWidth?: number
  readonly outputHeight?: number
  readonly mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  readonly quality?: number
}

/** Result extractors keep upload result envelopes owned by the host application. */
export type UploadResultUrlResolver<TValue> = (value: TValue) => string | undefined
