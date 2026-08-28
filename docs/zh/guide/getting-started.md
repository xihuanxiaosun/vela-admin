# 开始使用

Vela Admin Kit 是 Vue 3 + TypeScript + Vite + Vuetify 4 的后台工程底座，不绑定任何业务或
接口结构。建议从 Starter 创建项目，再按需安装工作区包。

## 环境要求

- Node.js 22.12 或更高版本
- pnpm 10
- Vue 3.5
- Vuetify 4.1

## 运行 Starter

克隆仓库后无需准备环境变量或后端服务，直接运行：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` 默认启动可直接改造成业务后台的 Starter。它的鉴权 HTTP 流程默认连接浏览器内
API 模拟器；接入正式后端时，只需替换 `apps/starter/src/data/user-services.ts` 中的传输层
组合。组件目录和文档站分别使用 `pnpm playground:dev` 与 `pnpm docs:dev`。

首次运行完整质量检查前，先安装一次 Playwright 浏览器：

```bash
pnpm test:e2e:install
pnpm check
pnpm check:security
```

## 创建 Vuetify

```ts
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createVelaLocale } from '@vela-admin/locale'
import { createVelaPreset } from '@vela-admin/theme'
import { createVelaFeedback } from '@vela-admin/ui'

import 'vuetify/styles'
import '@vela-admin/theme/styles.css'
import '@vela-admin/ui/styles.css'

const vuetify = createVuetify(createVelaPreset())
const locale = createVelaLocale({ locale: 'zh-CN' })
const feedback = createVelaFeedback()

createApp(App).use(vuetify).use(locale).use(feedback).mount('#app')
```

`createVelaPreset()` 已包含亮/暗主题、中英文 Vuetify 文案、断点、图标别名和默认密度。
业务项目只需要通过 options 增量覆盖。

## 推荐包顺序

1. `contracts` + `adapters`：先定义后端和鉴权边界；
2. `theme` + `locale` + `ui`：安装视觉与全局反馈；
3. `shell`：接入导航和用户信息；
4. `data`、`forms`、`upload`：按业务页面使用；
5. `access`：把路由、菜单、页面和操作统一到同一权限服务。

## 下一步

- [Starter 用户管理参考流程](/zh/guide/starter-user-workflow)
- [公开 API](/zh/reference/public-api)
- [上传与图片处理](/zh/guide/uploads)
- [发布维护](/zh/maintainers/releasing)
