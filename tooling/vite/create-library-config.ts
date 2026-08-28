import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type PluginOption, type UserConfig } from 'vite'
import dts from 'vite-plugin-dts'

export interface LibraryConfigOptions {
  entries?: Readonly<Record<string, string>>
  external?: readonly string[]
  vue?: boolean
}

const frameworkExternals = ['vue', 'vuetify'] as const

interface PackageManifest {
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

function readPackageExternals(): string[] {
  const packagePath = resolve(process.cwd(), 'package.json')
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageManifest

  return Object.keys({
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  })
}

export function createLibraryConfig(options: LibraryConfigOptions = {}): UserConfig {
  const externalPackages = new Set([
    ...frameworkExternals,
    ...readPackageExternals(),
    ...(options.external ?? []),
  ])
  const plugins: PluginOption[] = []

  if (options.vue) {
    plugins.push(vue())
  }

  plugins.push(
    dts({
      compilerOptions: {
        paths: {},
      },
      entryRoot: resolve(process.cwd(), 'src'),
      exclude: ['src/**/*.spec.ts'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      insertTypesEntry: true,
      tsconfigPath: resolve(process.cwd(), 'tsconfig.json'),
    }),
  )

  const libraryEntry = options.entries
    ? Object.fromEntries(
        Object.entries(options.entries).map(([name, entry]) => [
          name,
          resolve(process.cwd(), entry),
        ]),
      )
    : resolve(process.cwd(), 'src/index.ts')

  return defineConfig({
    build: {
      emptyOutDir: true,
      lib: {
        cssFileName: 'style',
        entry: libraryEntry,
        fileName: 'index',
        formats: ['es'],
      },
      rollupOptions: {
        external: (id) =>
          [...externalPackages].some(
            (packageName) => id === packageName || id.startsWith(`${packageName}/`),
          ),
        output: {
          entryFileNames: '[name].js',
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
      },
      sourcemap: true,
    },
    plugins,
  })
}
