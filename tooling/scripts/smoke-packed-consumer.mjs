import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { build } from 'vite'

const execFileAsync = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packagesRoot = resolve(root, 'packages')
const workspace = await mkdtemp(join(tmpdir(), 'vela-packed-consumer-'))
const packDirectory = resolve(workspace, 'packs')
const consumerRoot = resolve(workspace, 'consumer')
const consumerModules = resolve(consumerRoot, 'node_modules')

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

async function linkDependency(specifier) {
  const dependencyPath = specifier.split('/')
  const searchRoots = [
    root,
    resolve(root, 'apps/playground'),
    resolve(root, 'apps/starter'),
    ...(await readdir(packagesRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(packagesRoot, entry.name)),
  ]
  let source
  for (const searchRoot of searchRoots) {
    const candidate = resolve(searchRoot, 'node_modules', ...dependencyPath)
    try {
      await access(candidate)
      source = candidate
      break
    } catch {
      // Continue through workspace-local pnpm links.
    }
  }
  invariant(source, `Workspace dependency ${specifier} is not installed`)
  const destination = resolve(consumerModules, ...specifier.split('/'))
  await mkdir(dirname(destination), { recursive: true })
  await symlink(source, destination, process.platform === 'win32' ? 'junction' : 'dir')
}

async function packPackage(directory) {
  const packageRoot = resolve(packagesRoot, directory)
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'))
  if (manifest.private) return undefined

  const before = new Set(await readdir(packDirectory))
  const pnpmCli = process.env.npm_execpath
  invariant(pnpmCli, 'npm_execpath is required to run the packed-consumer smoke test')
  await execFileAsync(process.execPath, [
    pnpmCli,
    '--dir',
    packageRoot,
    'pack',
    '--pack-destination',
    packDirectory,
  ])
  const archive = (await readdir(packDirectory)).find(
    (name) => name.endsWith('.tgz') && !before.has(name),
  )
  invariant(archive, `${manifest.name}: pnpm pack did not create an archive`)

  const destination = resolve(consumerModules, ...manifest.name.split('/'))
  await mkdir(destination, { recursive: true })
  await execFileAsync('tar', [
    '-xzf',
    resolve(packDirectory, archive),
    '-C',
    destination,
    '--strip-components=1',
  ])
  const packedManifest = JSON.parse(await readFile(resolve(destination, 'package.json'), 'utf8'))
  invariant(
    packedManifest.name === manifest.name,
    `${manifest.name}: archive contains ${String(packedManifest.name)}`,
  )
  const externalDependencies = Object.keys({
    ...(packedManifest.dependencies ?? {}),
    ...(packedManifest.optionalDependencies ?? {}),
    ...(packedManifest.peerDependencies ?? {}),
  }).filter((dependency) => !dependency.startsWith('@vela-admin/'))

  return { externalDependencies, name: manifest.name }
}

try {
  await mkdir(packDirectory, { recursive: true })
  await mkdir(consumerModules, { recursive: true })

  const packageDirectories = (await readdir(packagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted()
  const packed = []
  const externalDependencies = new Set()
  // `pnpm pack` writes into one destination. Keep discovery deterministic and
  // validate each archive before starting the next package.
  for (const directory of packageDirectories) {
    const packageResult = await packPackage(directory)
    if (!packageResult) continue
    packed.push(packageResult.name)
    packageResult.externalDependencies.forEach((dependency) => externalDependencies.add(dependency))
  }

  await Promise.all([...externalDependencies].toSorted().map(linkDependency))

  await writeFile(
    resolve(consumerRoot, 'index.html'),
    '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>',
  )
  await mkdir(resolve(consumerRoot, 'src'), { recursive: true })
  await writeFile(
    resolve(consumerRoot, 'src/main.js'),
    `import 'vuetify/styles'
import '@vela-admin/theme/styles.css'
import '@vela-admin/ui/styles.css'
import '@vela-admin/forms/styles.css'
import '@vela-admin/data/styles.css'
import '@vela-admin/upload/styles.css'
import '@vela-admin/shell/styles.css'

import * as access from '@vela-admin/access'
import * as adapters from '@vela-admin/adapters'
import * as contracts from '@vela-admin/contracts'
import * as data from '@vela-admin/data'
import * as forms from '@vela-admin/forms'
import * as locale from '@vela-admin/locale'
import * as shell from '@vela-admin/shell'
import * as testing from '@vela-admin/testing'
import * as theme from '@vela-admin/theme'
import * as ui from '@vela-admin/ui'
import * as upload from '@vela-admin/upload'

globalThis.__VELA_PACKED_EXPORTS__ = Object.fromEntries(
  Object.entries({ access, adapters, contracts, data, forms, locale, shell, testing, theme, ui, upload })
    .map(([name, module]) => [name, Object.keys(module)]),
)
document.querySelector('#app').textContent = 'Packed Vela packages loaded'
`,
  )

  await build({
    configFile: false,
    root: consumerRoot,
    logLevel: 'error',
    build: { emptyOutDir: true, outDir: 'dist' },
  })
  await access(resolve(consumerRoot, 'dist/index.html'))
  process.stdout.write(
    `Packed consumer built successfully from ${packed.length} package archives.\n`,
  )
} finally {
  await rm(workspace, { recursive: true, force: true })
}
