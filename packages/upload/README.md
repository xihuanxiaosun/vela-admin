# @vela-admin/upload

Composable upload queues plus polished attachment, image-gallery, cover, avatar, crop, and preview
workflows. Validation, progress, concurrency, cancellation, retry, ordering, and failure reasons
remain independent of the transport adapter.

```bash
pnpm add @vela-admin/upload @vela-admin/ui vue vuetify
```

```ts
import { createUploadQueue, VaAvatarUpload, VaFileUpload, VaImageUpload } from '@vela-admin/upload'
import '@vela-admin/upload/styles.css'
```

`VaFileUpload` handles generic files; `VaImageUpload` adds gallery presentation, preview, ordering,
limits, and optional cropping; `VaAvatarUpload` provides a compact replace/remove workflow with a
default circular 1:1 crop. Cropper.js is loaded only when a crop dialog opens, preserving SSR-safe
module evaluation.

The package includes decoded dimension, aspect-ratio, pixel-count, type, extension, and byte-size
validators. Upload surfaces also support mobile camera hints, read-only display, visible capacity,
progress, retry, cancellation, and accessible ordering.

`prepareFile` is the extension point for compression, EXIF normalization, watermarking, encryption,
or a custom editor. `queue.seed()` places existing remote assets in the same preview/order/capacity
model without re-uploading or revoking host URLs. `beforeRemove` lets the host complete remote
authorization and deletion before local removal. The package never assumes an endpoint,
authorization scheme, response envelope, or persistence format. Licensed under MIT.
