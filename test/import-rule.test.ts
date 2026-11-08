import { expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

const sourceRoot = resolve(import.meta.dir, '../src')
const allowed = new Set([
  '@opentui/core',
  '@opentui/solid',
  '@opentui/solid/components',
  '@opentui/solid/jsx-runtime',
  '@opentui/solid/jsx-dev-runtime',
  'solid-js',
  'solid-js/store',
])

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(path) : [path]
    }),
  )
  return files.flat().filter((path) => /\.[cm]?[jt]sx?$/.test(path))
}

test('source imports bind only to the host runtime and stay inside src', async () => {
  const violations: string[] = []
  let imports = 0
  for (const path of await sourceFiles(sourceRoot)) {
    const source = await readFile(path, 'utf8')
    const check = (specifier: string) => {
      imports += 1
      if (specifier.startsWith('.')) {
        const destination = relative(
          sourceRoot,
          resolve(dirname(path), specifier),
        )
        if (
          destination !== '..' &&
          !destination.startsWith('../') &&
          !destination.startsWith('..\\')
        )
          return
      } else if (allowed.has(specifier)) {
        return
      }
      violations.push(`${relative(sourceRoot, path)}: ${specifier}`)
    }
    // TypeScript 7 has no JS parser API, and Bun's TSX scanner invents React
    // imports. This deliberately strict guard also matches comments and strings:
    // a false match fails safely rather than letting a second runtime through.
    if (/\b(?:import|require)\s*(?:\/\*[\s\S]*?\*\/\s*)*\(/u.test(source)) {
      violations.push(
        `${relative(sourceRoot, path)}: dynamic import or require`,
      )
    }
    const declarations =
      /\bfrom\s*(?:\/\*[\s\S]*?\*\/\s*)*(['"])([^'"]+)\1|\bimport\s*(?:\/\*[\s\S]*?\*\/\s*)*(['"])([^'"]+)\3/g
    for (const match of source.matchAll(declarations))
      check(match[2] ?? match[4] ?? '')
  }
  expect(imports).toBeGreaterThan(0)
  expect(violations).toEqual([])
})
