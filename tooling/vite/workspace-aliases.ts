import { fileURLToPath } from 'node:url'
import type { AliasOptions } from 'vite'

const packageNames = [
  'access',
  'adapters',
  'contracts',
  'data',
  'forms',
  'locale',
  'shell',
  'testing',
  'theme',
  'ui',
  'upload',
] as const

const visualPackageNames = ['data', 'forms', 'shell', 'theme', 'ui', 'upload'] as const

function sourcePath(packageName: string, fileName: string): string {
  return fileURLToPath(new URL(`../../packages/${packageName}/src/${fileName}`, import.meta.url))
}

export function createWorkspaceAliases(): AliasOptions {
  return [
    ...visualPackageNames.map((name) => ({
      find: new RegExp(`^@vela-admin/${name}/styles\\.css$`),
      replacement: sourcePath(name, 'styles.css'),
    })),
    ...packageNames.map((name) => ({
      find: new RegExp(`^@vela-admin/${name}$`),
      replacement: sourcePath(name, 'index.ts'),
    })),
  ]
}
