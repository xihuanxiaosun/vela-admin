import type { NormalizedError } from './error'

export interface UploadFileLike {
  readonly name: string
  readonly size: number
  readonly type: string
  readonly lastModified?: number
}

export interface UploadProgress {
  readonly loaded: number
  readonly total?: number
  readonly percentage?: number
}

export interface UploadRequest<TFile extends UploadFileLike = UploadFileLike, TMetadata = unknown> {
  readonly file: TFile
  readonly metadata?: TMetadata
  readonly signal: AbortSignal
  readonly onProgress: (progress: UploadProgress) => void
}

export interface UploadResult<TValue = unknown> {
  readonly value: TValue
  readonly fileName?: string
  readonly mediaType?: string
  readonly size?: number
}

export interface UploadAdapter<
  TValue = unknown,
  TFile extends UploadFileLike = UploadFileLike,
  TMetadata = unknown,
> {
  upload(request: UploadRequest<TFile, TMetadata>): Promise<UploadResult<TValue>>
  normalizeError?(error: unknown): NormalizedError
}
