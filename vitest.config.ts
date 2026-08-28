import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

import { createWorkspaceAliases } from './tooling/vite/workspace-aliases.ts'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: createWorkspaceAliases() },
  test: {
    coverage: {
      exclude: ['**/*.vue', '**/env.d.ts', '**/index.ts', '**/*.config.ts', '**/*.spec.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: 'happy-dom',
    globals: false,
    include: ['packages/**/*.spec.ts', 'apps/starter/src/**/*.spec.ts', 'tests/ssr/**/*.spec.ts'],
    restoreMocks: true,
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
})
