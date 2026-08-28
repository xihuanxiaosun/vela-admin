import type { UploadResultUrlResolver } from './types'

export const DEFAULT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export function isImageFile(file: Pick<File, 'type'>): boolean {
  return file.type.startsWith('image/')
}

/** Conservative convenience resolver for the common `{ url }` result envelope. */
export const resolveCommonUploadUrl: UploadResultUrlResolver<unknown> = (value) => {
  if (typeof value === 'string') return value
  if (typeof value !== 'object' || value === null || !('url' in value)) return undefined
  return typeof value.url === 'string' ? value.url : undefined
}

export function canvasToFile(
  canvas: HTMLCanvasElement,
  source: File,
  options: { readonly mimeType?: string; readonly quality?: number } = {},
): Promise<File> {
  const mimeType = (options.mimeType ?? source.type) || 'image/png'
  const quality = Math.max(0, Math.min(1, options.quality ?? 0.92))

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('The browser could not encode the cropped image.'))
          return
        }
        const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
        const baseName = source.name.replace(/\.[^.]+$/, '') || 'image'
        resolve(
          new File([blob], `${baseName}-cropped.${extension}`, {
            type: mimeType,
            lastModified: Date.now(),
          }),
        )
      },
      mimeType,
      quality,
    )
  })
}
