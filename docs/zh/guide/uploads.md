# 上传与图片处理

上传由两层组成：`createUploadQueue()` 管状态和并发，组件只负责交互。接口地址、鉴权、分片、
签名 URL 和响应格式都属于宿主 `UploadAdapter`。

```ts
const queue = createUploadQueue({
  adapter: uploadAdapter,
  concurrency: 3,
  validators: [
    maxFileSize(8 * 1024 * 1024),
    allowedMimeTypes(['image/png', 'image/jpeg', 'image/webp']),
  ],
  preview: createBrowserFilePreview(),
})
```

## 选择正确组件

- 普通附件：`VaFileUpload presentation="list"`；
- 商品/帖子图集：`VaImageUpload`，设置 `maxFiles` 和 `reorderable`；
- 封面：`VaImageUpload crop :max-files="1"`，声明固定比例与输出尺寸；
- 头像：`VaAvatarUpload`，默认 1:1 圆形裁剪。

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

## 裁剪与处理链

内置裁剪使用 Cropper.js 2.x，支持缩放、旋转、翻转、重置、键盘微调和输出编码。不传
`aspectRatio` 时为自由裁剪，不传输出尺寸时保留实际选区像素。批量图集默认不强制逐张
裁剪；头像和封面这类比例明确的场景才建议开启。

## 成熟业务需要的配置

- `maxFiles` 控制单图或多图形态，并明确显示容量；
- `accept` 控制文件选择器，队列校验器继续检查 MIME、扩展名、字节数和图片真实尺寸；
- `capture="user" | "environment"` 可在兼容的移动浏览器中请求前置或后置摄像头；
- `readonly` 保留预览但隐藏编辑动作，`disabled` 保留布局并禁用修改；
- `previewable`、`reorderable` 分别控制预览与排序；
- `cropOptions` 控制裁剪形状、比例、可选输出尺寸、编码格式与质量；
- `prepareFile` 可在裁剪后继续串接 EXIF 方向修正、压缩、水印、加密或业务编辑器；
- `resolveUrl` 负责把业务自己的上传响应映射到头像 `v-model`。

`useUploadValidators().imageDimensions()` 可以校验最小/最大宽高、总像素、比例和容差。

已有远程资源可直接进入同一队列，不会重新上传：

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

远程项以 `source: 'remote'` 标记，可参与预览、排序和数量限制，且框架不会回收宿主 URL。
服务端删除、排序保存和鉴权仍属于业务契约；将异步接口放进 `beforeRemove`，返回 `false`
保留原图，抛错则保留并显示失败原因。

额外压缩、EXIF 方向纠正、水印或加密通过 `prepareFile` 串入。它在入队之前执行，返回
`undefined` 即表示用户取消，不会产生失败任务。

## 生产要求

- 客户端校验不能替代服务端 MIME、尺寸和安全扫描；
- 不信任文件名与扩展名；
- 预签名上传必须限制路径、类型、大小和过期时间；
- 公共 URL 与临时 URL 要在业务模型中明确区分；
- 远端删除必须先在 `beforeRemove` 中由业务接口确认，再移除本地队列；
- 对象 URL 在队列移除或销毁时会自动回收。
