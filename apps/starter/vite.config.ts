import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import { createWorkspaceAliases } from '../../tooling/vite/workspace-aliases.ts'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: createWorkspaceAliases() },
})
