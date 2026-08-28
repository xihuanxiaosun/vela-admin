import { execFile } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const changesetRoot = resolve(root, '.changeset')
const packagesRoot = resolve(root, 'packages')

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

async function hasGitBaseline() {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root })
    return true
  } catch {
    return false
  }
}

async function runChangesetStatus() {
  const pnpmCli = process.env.npm_execpath
  invariant(pnpmCli, 'npm_execpath is required to run Changesets status')
  const { stderr, stdout } = await execFileAsync(
    process.execPath,
    [pnpmCli, 'exec', 'changeset', 'status'],
    { cwd: root },
  )
  process.stdout.write(stdout)
  process.stderr.write(stderr)
}

function readReleaseNames(source, filename) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  invariant(frontmatter, `${filename}: missing Changesets frontmatter`)
  const releases = new Set()
  for (const line of frontmatter[1].split(/\r?\n/)) {
    const release = line.match(/^\s*['"]?([^'":]+)['"]?\s*:\s*(patch|minor|major)\s*$/)
    invariant(release, `${filename}: invalid release declaration ${JSON.stringify(line)}`)
    releases.add(release[1])
  }
  invariant(releases.size > 0, `${filename}: no packages declared`)
  return releases
}

async function validateBootstrapChangesets() {
  const packageDirectories = (await readdir(packagesRoot, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  )
  const publishable = new Set()
  for (const directory of packageDirectories) {
    const manifest = JSON.parse(
      await readFile(resolve(packagesRoot, directory.name, 'package.json'), 'utf8'),
    )
    if (!manifest.private) publishable.add(manifest.name)
  }

  const files = (await readdir(changesetRoot)).filter((name) => name.endsWith('.md')).toSorted()
  invariant(files.length > 0, 'The first release requires at least one Changesets manifest')
  const declared = new Set()
  for (const filename of files) {
    const releases = readReleaseNames(
      await readFile(resolve(changesetRoot, filename), 'utf8'),
      filename,
    )
    for (const packageName of releases) {
      invariant(
        publishable.has(packageName),
        `${filename}: unknown publishable package ${packageName}`,
      )
      declared.add(packageName)
    }
  }

  const missing = [...publishable].filter((packageName) => !declared.has(packageName)).toSorted()
  invariant(
    missing.length === 0,
    `Initial changeset omits publishable packages: ${missing.join(', ')}`,
  )
  process.stdout.write(
    `Bootstrap release status is valid: ${files.length} changeset covers ${declared.size} publishable packages.\n` +
      'Changesets diff status will activate automatically after the initial Git commit.\n',
  )
}

if (await hasGitBaseline()) await runChangesetStatus()
else await validateBootstrapChangesets()
