import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function checkRuntime(version, solidVersion) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  await mkdir(join(root, 'target/scratch'), { recursive: true })
  const scratch = await mkdtemp(
    join(root, `target/scratch/opentui-${version}-`),
  )
  const run = (args) => {
    const result = spawnSync(process.execPath, args, {
      cwd: scratch,
      stdio: 'inherit',
    })
    if (result.error) throw result.error
    if (result.status !== 0)
      throw new Error(`Bun ${args.join(' ')} exited ${result.status}`)
  }
  try {
    // Isolate the authored frame from the newer compiler/loader toolchain.
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    await writeFile(
      join(scratch, 'package.json'),
      JSON.stringify({
        name: pkg.name,
        type: 'module',
        exports: { '.': './src/index.tsx' },
        dependencies: {
          '@opentui/core': version,
          '@opentui/solid': version,
          'solid-js': solidVersion,
          typescript: pkg.devDependencies.typescript,
          '@types/bun': pkg.devDependencies['@types/bun'],
        },
      }),
    )
    for (const path of ['src', 'test', 'scripts', 'bunfig.toml']) {
      await cp(join(root, path), join(scratch, path), { recursive: true })
    }
    await writeFile(
      join(scratch, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ESNext',
          module: 'Preserve',
          moduleResolution: 'Bundler',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          jsx: 'preserve',
          jsxImportSource: '@opentui/solid',
          types: ['bun'],
          allowImportingTsExtensions: true,
        },
        include: ['src/**/*', 'test/**/*'],
      }),
    )
    run(['install', '--ignore-scripts'])
    run([
      '-e',
      `for (const [name, expected] of ${JSON.stringify([
        ['@opentui/core', version],
        ['@opentui/solid', version],
        ['solid-js', solidVersion],
      ])}) {
      const pkg = await Bun.file(new URL(import.meta.resolve(name + '/package.json'))).json()
      if (pkg.version !== expected) throw new Error(name + ' expected ' + expected + ', loaded ' + pkg.version)
      console.log('Loaded ' + name + ' ' + pkg.version)
    }`,
    ])
    run(['x', '--no-install', 'tsc', '--version'])
    run(['x', '--no-install', 'tsc', '--noEmit'])
    run(['test'])
    console.log(
      `Sidebar OpenTUI ${version} / Solid ${solidVersion}: typecheck and frame tests passed`,
    )
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}
