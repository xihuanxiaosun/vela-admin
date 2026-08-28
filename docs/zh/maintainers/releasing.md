# 发布维护

首次公开发布前，必须先确认真实 GitHub 仓库、`@vela-admin` npm scope 所有权和受保护的
`npm` Environment。本仓库不会为了通过检查写入虚假的 repository 地址。

## 正常流程

1. 公开 API 变更必须添加 Changeset；
2. 本地运行 `pnpm release:status`、`pnpm check` 与 `pnpm check:security`；
3. 合并到受保护的 `main`；
4. 手动运行 **Release packages**，由 Changesets 创建版本 PR；
5. 审查版本号和 Changelog 后合并；
6. 再次运行发布工作流，通过 npm provenance 发布；
7. 在全新项目安装 tarball，验证类型、样式、SSR 和构建。

仓库首次提交前，`release:status` 会确认全部可发布包都被合法 Changeset 覆盖；存在 `HEAD`
后会自动切换为 Changesets 官方的分支差异检查。

## 视觉基线

Playwright 按操作系统保存截图基线。Chromium、字体或有意的视觉输出发生变化时，在 GitHub
Actions 手动运行 **Update visual baselines**，下载 `visual-baselines-linux` 产物，逐张审查后
再提交认可的 Linux 基线。本机平台可用 `pnpm test:e2e:update` 生成；不要为了消除原因不明的
失败而直接刷新截图。

完整英文操作说明见 [Releasing Vela Admin Kit](/maintainers/releasing)。
