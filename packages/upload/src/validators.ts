import type { NormalizedError, UploadFileLike } from '@vela-admin/contracts'
import { useVelaLocale, type VelaLocaleController } from '@vela-admin/locale'

import type { UploadValidator } from './types'

export interface UploadValidatorFactory {
  readonly maxFileSize: <TFile extends UploadFileLike>(
    bytes: number,
    message?: string,
  ) => UploadValidator<TFile>
  readonly allowedMimeTypes: <TFile extends UploadFileLike>(
    mimeTypes: readonly string[],
    message?: string,
  ) => UploadValidator<TFile>
  readonly allowedExtensions: <TFile extends UploadFileLike>(
    extensions: readonly string[],
    message?: string,
  ) => UploadValidator<TFile>
  readonly imageDimensions: (rules: ImageDimensionRules, message?: string) => UploadValidator<File>
}

export interface ImageDimensions {
  readonly width: number
  readonly height: number
}

export interface ImageDimensionRules {
  readonly minWidth?: number
  readonly maxWidth?: number
  readonly minHeight?: number
  readonly maxHeight?: number
  readonly maxPixels?: number
  readonly aspectRatio?: number
  readonly aspectTolerance?: number
  /** Test and non-browser escape hatch. Production callers normally use the built-in decoder. */
  readonly inspect?: (file: File) => Promise<ImageDimensions>
}

function validationError(message: string, code: string): NormalizedError {
  return { kind: 'validation', message, code, retryable: false }
}

export function maxFileSize<TFile extends UploadFileLike>(
  bytes: number,
  message = `File must be smaller than ${bytes} bytes`,
): UploadValidator<TFile> {
  return (file) =>
    file.size > bytes ? validationError(message, 'upload.file-too-large') : undefined
}

export function allowedMimeTypes<TFile extends UploadFileLike>(
  mimeTypes: readonly string[],
  message = 'This file type is not allowed',
): UploadValidator<TFile> {
  const allowed = new Set(mimeTypes.map((type) => type.toLowerCase()))
  return (file) =>
    allowed.has(file.type.toLowerCase())
      ? undefined
      : validationError(message, 'upload.type-not-allowed')
}

export function allowedExtensions<TFile extends UploadFileLike>(
  extensions: readonly string[],
  message = 'This file extension is not allowed',
): UploadValidator<TFile> {
  const allowed = new Set(
    extensions.map((extension) =>
      (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase(),
    ),
  )
  return (file) => {
    const dot = file.name.lastIndexOf('.')
    const extension = dot < 0 ? '' : file.name.slice(dot).toLowerCase()
    return allowed.has(extension)
      ? undefined
      : validationError(message, 'upload.extension-not-allowed')
  }
}

export async function inspectImageDimensions(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    try {
      return { width: bitmap.width, height: bitmap.height }
    } finally {
      bitmap.close()
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('The selected image could not be decoded.'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function imageDimensions(
  rules: ImageDimensionRules,
  message = 'Image dimensions are outside the allowed range',
): UploadValidator<File> {
  const inspect = rules.inspect ?? inspectImageDimensions
  return async (file) => {
    let dimensions: ImageDimensions
    try {
      dimensions = await inspect(file)
    } catch (cause) {
      return {
        ...validationError('The selected image could not be decoded', 'upload.image-unreadable'),
        cause,
      }
    }

    const { width, height } = dimensions
    const ratio = width / height
    const tolerance = Math.max(0, rules.aspectTolerance ?? 0.01)
    const outsideRange =
      (rules.minWidth !== undefined && width < rules.minWidth) ||
      (rules.maxWidth !== undefined && width > rules.maxWidth) ||
      (rules.minHeight !== undefined && height < rules.minHeight) ||
      (rules.maxHeight !== undefined && height > rules.maxHeight) ||
      (rules.maxPixels !== undefined && width * height > rules.maxPixels) ||
      (rules.aspectRatio !== undefined && Math.abs(ratio - rules.aspectRatio) > tolerance)
    return outsideRange ? validationError(message, 'upload.image-dimensions') : undefined
  }
}

/** Creates validators with localized fallback messages while preserving explicit overrides. */
export function createUploadValidators(
  locale: Pick<VelaLocaleController, 't'>,
): UploadValidatorFactory {
  return {
    maxFileSize: (bytes, message) =>
      maxFileSize(bytes, message ?? locale.t('upload.error.maxSize', { bytes })),
    allowedMimeTypes: (mimeTypes, message) =>
      allowedMimeTypes(mimeTypes, message ?? locale.t('upload.error.type')),
    allowedExtensions: (extensions, message) =>
      allowedExtensions(extensions, message ?? locale.t('upload.error.extension')),
    imageDimensions: (rules, message) =>
      imageDimensions(rules, message ?? locale.t('upload.error.dimensions')),
  }
}

/** Use inside setup when upload validation should follow the current application locale. */
export function useUploadValidators(): UploadValidatorFactory {
  return createUploadValidators(useVelaLocale())
}
