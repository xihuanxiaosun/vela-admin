# Starter 用户管理参考流程

可复制的 `apps/starter` 包含一套完整的用户管理流程。它属于应用示例，不是公开发布包，也不
代表生产后端实现。

## 这套流程展示什么

- 使用 `useDataPage` 和 HTTP repository 加载类型安全的列表；
- 通过 `createAuthenticatedTransport` 注入 Bearer Token；
- 在 transport 边界完成分页和筛选参数序列化；
- 覆盖响应式搜索、筛选、语义表格、新建、编辑和删除；
- 由同一个注入式权限服务控制路由、导航和操作按钮；
- 应用内 API 模拟器独立执行权限校验；
- 覆盖本地化验证、确认、反馈、取消、冲突和数据不存在错误。

实现全部留在 Starter 应用内：

| 文件                                         | 职责                                      |
| -------------------------------------------- | ----------------------------------------- |
| `src/data/users.ts`                          | 领域记录、输入、repository 契约和种子数据 |
| `src/data/user-http-repository.ts`           | HTTP 路径、查询参数和响应包装映射         |
| `src/data/demo-user-api.ts`                  | 可替换的浏览器内 API 模拟器               |
| `src/data/user-services.ts`                  | transport 与 repository 组合入口          |
| `src/access-policy.ts`                       | 演示角色、capability 和 token claim       |
| `src/access.ts`                              | 注入式鉴权与权限 adapter                  |
| `src/router.ts` 与 `src/views/UsersPage.vue` | 路由和操作权限执行                        |

模拟器会在每次请求前短暂等待，方便观察加载、刷新和取消状态。它在读取或修改记录前还会检查
Bearer Token 与对应 capability，因此示例并不是只隐藏前端按钮。

## 角色矩阵

可以通过 Starter 顶栏的角色菜单直接验证每种策略。

| Capability        | 管理员 | 编辑者 | 只读成员 |
| ----------------- | ------ | ------ | -------- |
| `users.read`      | 是     | 是     | 是       |
| `users.create`    | 是     | 是     | 否       |
| `users.update`    | 是     | 是     | 否       |
| `users.delete`    | 是     | 否     | 否       |
| `settings.manage` | 是     | 否     | 否       |

导航过滤会移除没有权限的入口；即使直接输入地址，`createVelaRouteGuard` 仍会保护页面；执行用户
操作前还会再次检查权限，最终由演示 API 独立兜底。

## 接入生产 API

保留 `createHttpStarterUserRepository()`，只替换 `src/data/user-services.ts` 里的组合入口：

```ts
import { createAuthenticatedTransport, createFetchTransport } from '@vela-admin/adapters'

import { starterAuthAdapter } from '../access'
import { createHttpStarterUserRepository } from './user-http-repository'

const http = createFetchTransport({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: 'include',
})

const authenticatedHttp = createAuthenticatedTransport(http, starterAuthAdapter)

export const starterUserRepository = createHttpStarterUserRepository(authenticatedHttp)
```

随后把 Starter auth adapter 换成项目自己的会话来源，repository 契约和页面都不需要改。如果
后端路径、查询字段或响应包装不同，只调整 `user-http-repository.ts`。

`access-policy.ts` 里的 token 格式只用于让本地示例稳定运行。真实后端必须验证可信会话或
token claim，并在服务端执行每一项 capability。前端路由守卫、导航过滤和隐藏按钮只改善
体验，不能作为安全边界。
