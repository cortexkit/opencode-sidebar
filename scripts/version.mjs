import { readFile, writeFile } from 'node:fs/promises'

const [version, mode] = process.argv.slice(2)
if (
  process.argv.length > 4 ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version ?? '') ||
  (mode !== undefined && mode !== '--check' && mode !== '--validate')
)
  throw new Error('Usage: version.mjs <major.minor.patch> [--validate|--check]')

const path = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(await readFile(path, 'utf8'))
if (mode === '--check') {
  if (pkg.version !== version)
    throw new Error(`Tag ${version} does not match package ${pkg.version}`)
} else if (mode !== '--validate') {
  pkg.version = version
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`)
}
