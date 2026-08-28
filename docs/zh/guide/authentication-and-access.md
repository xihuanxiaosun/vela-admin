# 认证与权限

Vela 只协调会话状态和权限决策，不内置账号体系、接口地址、token 存储、角色名称或路由路径。
宿主应用实现 `@vela-admin/contracts` 中与框架无关的 adapter，再统一安装
`@vela-admin/access`。

```ts
import { createVelaAccess } from '@vela-admin/access'

export const access = createVelaAccess({
  auth: myAuthAdapter,
  permission: myPermissionAdapter,
  permissionFallback: 'deny',
})

app.use(access)
await access.initialize()
```

缺失 permission adapter 时，具名 capability 默认拒绝。匿名会话也会 fail closed。

## 路由与操作

使用 `createVelaRouteGuard` 保护页面，并由宿主应用明确指定登录页、无权限页和首页。可选区域或
按钮使用 `VelaAccessBoundary`：

```vue
<VelaAccessBoundary capability="users.create">
  <VaButton>新建用户</VaButton>
</VelaAccessBoundary>
```

隐藏按钮不是权限边界。对应路由和后端接口仍然必须执行同一项权限检查。

## 可运行的 Starter 示例

Starter 提供管理员、编辑者和只读成员三个可切换角色，并把同一组 capability 同时用于导航、
路由和用户操作。HTTP API 模拟器会独立检查每次请求。完整角色矩阵及生产 transport 替换方式
见 [Starter 用户管理参考流程](./starter-user-workflow.md)。
