# Uploads

`createUploadQueue()` is a transport-independent state machine for file validation, previews,
concurrency, progress, cancellation, retry, and cleanup.

```ts
const queue = createUploadQueue({
  adapter: myUploadAdapter,
  concurrency: 3,
  validators: [
    maxFileSize(8 * 1024 * 1024),
    allowedMimeTypes(['image/png', 'image/jpeg', 'image/webp']),
  ],
  preview: createBrowserFilePreview(),
})
```

Each queue item has an explicit state: queued, validating, uploading, success, error, or cancelled.
The UI shows progress when the adapter reports bytes, uses indeterminate progress otherwise, and
keeps the normalized failure reason next to the file.

## Adapter responsibilities

An upload adapter receives a file, `AbortSignal`, progress callback, and optional metadata. It
returns a normalized value such as an asset ID or URL. The adapter owns protocol details: multipart,
signed URLs, chunking, retries imposed by the service, and response parsing.

Preview URLs are revoked when an item is removed or the queue is disposed. Validation happens
before transport work begins; client validation complements but never replaces server validation.

## Choose the right upload surface

| Pattern                | Component            | Default behavior                                                   |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| Attachments            | `VaFileUpload`       | list, file metadata, progress, retry, cancel and remove            |
| Product or post images | `VaImageUpload`      | gallery, preview, max count and accessible reordering              |
| Editorial cover        | `VaImageUpload crop` | one image with an explicit aspect ratio and output size            |
| Profile image          | `VaAvatarUpload`     | compact circular UI, replace/remove, progress overlay and 1:1 crop |

```vue
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
/>
```

Cropping uses Cropper.js 2.x and supports zoom, rotation, horizontal flip, keyboard movement, reset,
and configurable encoding. Omit `aspectRatio` for a free crop; omit output dimensions to preserve
the selected pixels. Gallery uploads do not force every image through a crop dialog; enable crop
only when the business asset has a real aspect-ratio contract.

## Configuration checklist

- `maxFiles` selects the single-image or multi-image interaction and enforces visible capacity.
- `accept` constrains the native picker; queue validators still enforce MIME, extension, bytes, and
  decoded image dimensions.
- `capture="user" | "environment"` can request a front or rear camera on compatible mobile
  browsers without changing desktop behavior.
- `readonly` preserves preview while hiding edit controls; `disabled` preserves the layout but
  disables mutation.
- `previewable` and `reorderable` control gallery interaction independently.
- `cropOptions` owns crop shape, aspect ratio, optional output dimensions, MIME, and quality.
- `prepareFile` chains optional EXIF normalization, compression, watermarking, encryption, or a
  product editor after cropping and before transport begins.
- `resolveUrl` maps an application-owned result envelope into the avatar `v-model`.

Use decoded-dimension validation when an asset has a real pixel contract:

```ts
const validators = useUploadValidators()
const coverQueue = useUploadQueue({
  adapter,
  validators: [
    validators.maxFileSize(8 * 1024 * 1024),
    validators.allowedMimeTypes(['image/jpeg', 'image/png', 'image/webp']),
    validators.imageDimensions({
      minWidth: 1200,
      aspectRatio: 16 / 9,
      aspectTolerance: 0.015,
      maxPixels: 24_000_000,
    }),
  ],
})
```

Seed already persisted assets without re-uploading them:

```ts
queue.seed([
  {
    id: asset.id,
    name: asset.fileName,
    url: asset.previewUrl,
    type: asset.mimeType,
    result: { value: asset },
  },
])
```

Seeded items have `source: 'remote'`, begin in the successful state, participate in preview,
ordering, capacity, and form display, and never revoke their host-owned URL. Local items have
`source: 'local'` and continue through validation and transport.

The host still owns server deletion because authorization, retention, reference checks, and API
shape are business contracts. Use `beforeRemove` to await that decision before the queue mutates;
return `false` to keep the asset or throw to retain it and show a localized failure. `removed` and
`remove-error` make persistence orchestration explicit.

## Pre-upload processing

`prepareFile` is an optional async pipeline for compression, EXIF orientation, watermarks, client
encryption, or a product-specific editor. Return `undefined` when the user cancels; no failed queue
item is created.

```ts
const prepareFile: UploadFilePreparer<File> = async (file) => {
  const normalized = await normalizeExif(file)
  return compressImage(normalized, { maximumBytes: 1_500_000 })
}
```

The cropper is a UI capability, not an upload protocol. `UploadAdapter` remains replaceable and the
host maps its own result envelope through `resolveUrl` when `VaAvatarUpload` should update a model.

## Production security

- Validate MIME, file signature, dimensions, byte size, and authorization again on the server.
- Treat file names and extensions as untrusted display data.
- Constrain signed-upload paths, MIME types, sizes, and expiry.
- Distinguish temporary and public asset locations in the business model.
- Scan untrusted documents and never render uploaded HTML or SVG as trusted markup.
- Removing a seeded item does not imply remote deletion; perform that API in `beforeRemove` and
  resolve only after the server accepts it.

## Locale-aware setup

`useUploadQueue()` supplies localized fallback failure copy, while `useUploadValidators()` supplies
localized validator messages. Both preserve explicit per-rule and per-queue overrides:

```ts
const validators = useUploadValidators()
const queue = useUploadQueue({
  adapter: myUploadAdapter,
  validators: [validators.maxFileSize(8 * 1024 * 1024)],
})
```

Use `createUploadQueue()` and `createUploadValidators(locale)` when constructing upload workflows
outside Vue component setup.
