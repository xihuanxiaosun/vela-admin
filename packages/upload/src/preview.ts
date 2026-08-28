import type { UploadFileLike } from '@vela-admin/contracts'

import type { UploadPreviewAdapter } from './upload-queue'

export interface BrowserPreviewOptions<TFile extends UploadFileLike> {
  readonly canPreview?: (file: TFile) => boolean
}

export function createBrowserFilePreview<TFile extends File = File>(
  options: BrowserPreviewOptions<TFile> = {},
): UploadPreviewAdapter<TFile> {
  const canPreview = options.canPreview ?? ((file) => file.type.startsWith('image/'))
  return {
    create(file): string | undefined {
      return canPreview(file) && typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined
    },
    revoke(url): void {
      if (typeof URL !== 'undefined') URL.revokeObjectURL(url)
    },
  }
}
