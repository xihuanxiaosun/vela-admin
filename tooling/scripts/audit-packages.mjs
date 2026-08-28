import { access, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packagesRoot = resolve(root, 'packages')
const repositoryUrl = 'git+https://github.com/xihuanxiaosun/vela-admin.git'
const homepageUrl = 'https://github.com/xihuanxiaosun/vela-admin#readme'
const issuesUrl = 'https://github.com/xihuanxiaosun/vela-admin/issues'

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readManifest(directory) {
  const path = resolve(packagesRoot, directory, 'package.json')
  return JSON.parse(await readFile(path, 'utf8'))
}

function collectInternalDependencies(manifest) {
  return Object.entries({
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  }).filter(([name]) => name.startsWith('@vela-admin/'))
}

function assertAcyclic(graph) {
  const visiting = new Set()
  const visited = new Set()

  const visit = (name, path = []) => {
    if (visiting.has(name))
      throw new Error(`Package dependency cycle: ${[...path, name].join(' -> ')}`)
    if (visited.has(name)) return
    visiting.add(name)
    for (const dependency of graph.get(name) ?? []) visit(dependency, [...path, name])
    visiting.delete(name)
    visited.add(name)
  }

  for (const name of graph.keys()) visit(name)
}

const directories = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted()
const packages = []

for (const directory of directories) {
  const manifest = await readManifest(directory)
  if (manifest.private) continue
  const packageRoot = resolve(packagesRoot, directory)
  invariant(manifest.name?.startsWith('@vela-admin/'), `${directory}: invalid package name`)
  invariant(manifest.type === 'module', `${manifest.name}: only ESM packages are supported`)
  invariant(manifest.license === 'MIT', `${manifest.name}: license must be MIT`)
  invariant(manifest.repository?.type === 'git', `${manifest.name}: repository type must be git`)
  invariant(
    manifest.repository?.url === repositoryUrl,
    `${manifest.name}: repository URL must be ${repositoryUrl}`,
  )
  invariant(
    manifest.repository?.directory === `packages/${directory}`,
    `${manifest.name}: repository directory must be packages/${directory}`,
  )
  invariant(manifest.homepage === homepageUrl, `${manifest.name}: homepage must be ${homepageUrl}`)
  invariant(manifest.bugs?.url === issuesUrl, `${manifest.name}: bugs URL must be ${issuesUrl}`)
  invariant(
    Array.isArray(manifest.files) && manifest.files.length === 1 && manifest.files[0] === 'dist',
    `${manifest.name}: published files must be limited to dist`,
  )
  invariant(
    await exists(resolve(packageRoot, 'README.md')),
    `${manifest.name}: README.md is missing`,
  )
  invariant(await exists(resolve(root, 'LICENSE')), 'Repository LICENSE is missing')

  for (const field of ['main', 'module', 'types']) {
    invariant(typeof manifest[field] === 'string', `${manifest.name}: ${field} is missing`)
    invariant(
      await exists(resolve(packageRoot, manifest[field])),
      `${manifest.name}: ${field} target ${manifest[field]} does not exist`,
    )
  }

  invariant(manifest.exports?.['.']?.import, `${manifest.name}: ESM root export is missing`)
  invariant(manifest.exports?.['.']?.types, `${manifest.name}: type root export is missing`)
  if (manifest.exports?.['./styles.css']) {
    const stylesheet = resolve(packageRoot, manifest.exports['./styles.css'])
    invariant(await exists(stylesheet), `${manifest.name}: stylesheet export target does not exist`)
    invariant(
      (await stat(stylesheet)).size <= 96 * 1024,
      `${manifest.name}: stylesheet exceeds the 96 KiB package budget`,
    )
  }

  const internalDependencies = collectInternalDependencies(manifest)
  for (const [name, range] of internalDependencies) {
    if (manifest.peerDependencies?.[name] !== undefined) continue
    invariant(range === 'workspace:*', `${manifest.name}: ${name} must use workspace:* internally`)
  }
  packages.push({ manifest, internalDependencies: internalDependencies.map(([name]) => name) })
}

const packageNames = new Set(packages.map(({ manifest }) => manifest.name))
const graph = new Map(
  packages.map(({ manifest, internalDependencies }) => [
    manifest.name,
    internalDependencies.filter((dependency) => packageNames.has(dependency)),
  ]),
)
assertAcyclic(graph)

process.stdout.write(
  `Audited ${packages.length} publishable packages: metadata, outputs, and dependency graph are valid.\n`,
)
