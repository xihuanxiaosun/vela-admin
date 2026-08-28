# 国际化与 RTL

Vela 使用应用级语言控制器，同时管理框架文案、Vuetify 原生组件语言、页面 `lang` 与
`dir`。框架内置英文和简体中文文案；业务菜单、字段、状态与接口词汇由接入应用注册，
避免把某个项目的业务语义写进通用组件。

## 初始化

```ts
import { createApp } from 'vue'
import { createVelaLocale } from '@vela-admin/locale'

const locale = createVelaLocale({
  locale: 'zh-CN',
  fallbackLocale: 'en',
})

createApp(App).use(locale).mount('#app')
```

在 Vuetify 之内、Vela 组件之上挂载 Provider：

```vue
<script setup lang="ts">
import { VelaLocaleProvider } from '@vela-admin/locale'
</script>

<template>
  <VelaLocaleProvider>
    <RouterView />
  </VelaLocaleProvider>
</template>
```

`createVelaPreset()` 已注册 Vuetify 的英文与简体中文词典，因此分页、选择框等原生控件
会与 Vela 组件同步切换。

## 注册业务文案

业务词典放在应用内，并用类型约束保证中英文键完全一致：

```ts
const english = {
  'app.nav.users': 'Users',
  'app.users.status.active': 'Active',
  'app.users.column.email': 'Email',
}

const simplifiedChinese = {
  'app.nav.users': '用户',
  'app.users.status.active': '正常',
  'app.users.column.email': '邮箱',
} satisfies Record<keyof typeof english, string>

locale.registerMessages('en', english)
locale.registerMessages('zh-CN', simplifiedChinese)
```

包含翻译文案的菜单、筛选、表格列和表单配置必须是响应式的。若在模块加载时只创建一次，
切换语言后仍会残留旧文案：

```ts
const columns = computed(() => [
  { key: 'email', title: locale.t('app.users.column.email') },
  {
    key: 'status',
    title: locale.t('app.users.column.status'),
    presentation: {
      kind: 'status',
      values: {
        active: { label: locale.t('app.users.status.active'), tone: 'success' },
      },
    },
  },
])
```

菜单与面包屑、页签、筛选项、表头、状态与操作、表单校验、反馈、缺省状态、上传提示以及
日期/数字格式都遵循同一规则。姓名、ID、邮箱和提交给后端的枚举值保持不变，只翻译展示层。

## 接入现有 i18n

可用 `translate` 适配器接入 vue-i18n、内部翻译服务或服务端词典：

```ts
const locale = createVelaLocale({
  locale: i18n.global.locale.value,
  translate: (key, { parameters }) =>
    i18n.global.te(key) ? String(i18n.global.t(key, parameters)) : undefined,
})
```

## 验收标准

浏览器测试应在不刷新页面的情况下切换语言，并验证：

- 文档 `lang`、`dir`；
- 导航、面包屑、搜索、页签和设置；
- 筛选、选项、表头、单元格语义、操作与分页；
- 表单、校验、弹窗、Toast、加载、缺省页和上传；
- 日期、相对时间、数字和货币格式；
- Vuetify 原生控件与业务文案同步切换。

Playground 已包含英文与简体中文的逐页浏览器验收；业务词典使用
`satisfies Record<...>` 强制中英文键完整对应。
