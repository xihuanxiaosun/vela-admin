# 公开 API

Vela 提供与后端无关的契约、组合式函数、适配器和后台复合组件。业务仍可直接使用
Vuetify；只有当一个模式具备稳定语义、编排逻辑、无障碍要求或跨项目复用价值时，Vela
才进行二次封装。

所有包均为 ESM，支持 Tree-shaking 和严格 TypeScript，要求 Vue 3.5 与 Vuetify 4。

```ts
import { createVelaPreset } from '@vela-admin/theme'
import { VaDataPage, useDataPage } from '@vela-admin/data'
import { VaFormDialog } from '@vela-admin/forms'
import { VaAvatarUpload, createUploadQueue } from '@vela-admin/upload'
```

## 包职责

| 包                      | 主要能力                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `@vela-admin/contracts` | 异步状态、错误、请求、鉴权、权限、分页、查询、上传契约       |
| `@vela-admin/adapters`  | Fetch、鉴权请求、查询序列化、分页响应、Web Storage 适配      |
| `@vela-admin/access`    | 默认拒绝的身份、能力、路由与组件权限控制                     |
| `@vela-admin/theme`     | 亮/暗主题、设计令牌、Vuetify defaults、运行时外观设置        |
| `@vela-admin/locale`    | 中英文框架文案、业务翻译桥接、LTR/RTL 同步                   |
| `@vela-admin/ui`        | 语义按钮、头像、Tag、状态页、弹窗、Toast、确认、全局 Loading |
| `@vela-admin/forms`     | 配置式字段、分组、验证、数据映射、居中创建/编辑流程          |
| `@vela-admin/data`      | 筛选、表格、分页、选择、列管理、操作、CSV 导出               |
| `@vela-admin/upload`    | 校验、进度、取消、重试、预览、裁剪、头像、封面与图集         |
| `@vela-admin/shell`     | 导航、页头、标签页、快捷搜索、外观设置                       |
| `@vela-admin/testing`   | 延迟 Promise、内存适配器等确定性测试工具                     |

## 后端适配

分页原生支持 `page/pageSize`、`offset/limit` 和 cursor。使用
`createPageResponseAdapter`、`createOffsetResponseAdapter` 或
`createCursorResponseAdapter`，通过路径或选择函数读取 `data.list`、`items`、`records`
等任意响应结构，无需修改表格组件。

`createFetchTransport` 只处理通用请求；`createAuthenticatedTransport` 注入凭据并协调一次
刷新。Token 格式、错误结构、接口地址、权限码和业务字段均由宿主项目负责。

`createVelaAccess` 默认拒绝未知权限。`VelaAccessBoundary`、菜单、路由守卫和操作按钮共用
同一个权限服务，避免四处各写一套判断。

## 主题与国际化

`createVelaPreset()` 默认带亮色、暗色、中英文 Vuetify 语言包、断点、图标别名和组件
defaults。外观控制器可配置颜色模式、品牌色、密度、圆角、透明度、动效、字号、对比度、
导航布局、内容宽度、页头样式和页面间距。

`createVelaLocale()` 按应用或 SSR 请求创建独立实例。`VelaLocaleProvider` 同步 Vuetify、
页面 `lang` 和 `dir`。业务可以通过 `translate` 接入 vue-i18n 或其他翻译系统。

## 表单

`FormSchema<TValues>` 支持文本、多行文本、密码、邮箱、数字、选择、搜索选择、组合输入、
复选、开关、单选、日期、日期时间和自定义字段。字段布局可声明一行一个或一行两个，
不需要在业务页写布局 CSS。

`VaFormDialog` 是默认居中创建/编辑流程；`useFormWorkflow` 统一处理详情加载、回显映射、
提交映射、服务端字段错误、过期请求取消和脏数据关闭确认。后端 DTO 通过
`createFormDataMapper` 与表单值隔离。

`useFormDraft` 通过注入的 `StorageAdapter` 保存带版本的表单草稿，支持防抖写入、结构迁移、
恢复与丢弃，不在组件中直接绑定 `localStorage`。`VaFormDialog` 可直接接入草稿控制器。

## 数据页

`VaDataPage` 负责工具栏、表格、分页和剩余高度；`useDataPage` 负责首载、保留旧数据刷新、
错误、重试、筛选、排序、分页联动和请求竞态取消。

`VaDataTable` 支持语义列宽、唯一自适应填充列、内部滚动、固定表头、列宽调整和稳定的
操作列固定。普通首列/尾列默认不固定；操作列结构保持固定，只有真正横向溢出时才显示
分隔阴影，避免表头固定而内容未固定。

`VaTableCell` 内置身份、媒体、金额、数字、时间、状态、布尔、进度和趋势展示；
`VaRowActions` 默认显示一个带文字的主操作，其余进入可访问的更多菜单。`VaPager` 同时支持
三种分页，并带有大页数跳转。

`useDataQueryState` 可通过 `StateSyncAdapter` 将筛选、搜索、排序和分页同步到 URL 或宿主
路由；`useSavedViews` 通过存储适配器保存命名视图。两者均不把浏览器或后端细节写进表格。

## 图片与文件上传

`createUploadQueue()` 接收宿主上传适配器、校验器、并发数、重试策略和预览适配器，返回
`add/seed/start/pause/cancel/retry/move/remove/clearCompleted/drain/dispose`。
`imageDimensions()` 可按解码后的真实宽高、总像素、比例与容差进行校验。

| 组件                   | 使用场景                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `VaFileUpload`         | 通用列表/图集，数量、进度、重试、取消、排序、预览和只读模式  |
| `VaImageUpload`        | 图片图集或封面，支持移动端相机提示，可在入队前裁剪           |
| `VaAvatarUpload`       | 头像 UI，拖放、更换、删除、相机提示、圆形预览和默认 1:1 裁剪 |
| `VaImageCropDialog`    | 居中自由/固定比例裁剪，支持缩放、旋转、翻转、重置和输出设置  |
| `VaImagePreviewDialog` | 大图预览                                                     |

`ImageCropOptions` 可设置比例、圆形/矩形呈现、输出尺寸、MIME 和质量。
`UploadFilePreparer<File>` 是裁剪、压缩、EXIF 纠正、水印、加密等处理链的扩展口；返回
`undefined` 表示用户取消。上传结果结构仍由业务拥有，通过 `resolveUrl` 映射即可。
`queue.seed()` 可回显已有远程资源而不重新上传；`beforeRemove` 允许业务先完成服务端鉴权、
引用检查与删除，成功后再移出本地队列。

## Shell 与反馈

`VaAppShell` 支持侧栏、紧凑图标栏、顶部导航、响应式抽屉、盒式/铺满内容、悬浮/贴合页头、
工作区/文档页模式和安全区。`VaWorkspaceTabs`、`VaCommandPalette`、
`VaAppearanceSettings` 可独立使用。

全局只安装一次 `createVelaFeedback()` 并渲染 `VaFeedbackHost`。业务代码可直接调用
`toast`、`confirm`、`prompt` 和全局 Loading，无需手工创建 DOM。

## 扩展规则

1. 原子控件优先使用 Vuetify defaults 和 variants。
2. 只封装稳定、重复的后台复合模式。
3. 接口、鉴权、响应结构和上传协议一律放入 adapter。
4. 菜单、路由、能力码、字段与业务文案留在宿主项目。
5. 每个公开 API 变更必须同时有 Changeset、测试、文档和逃生口。
