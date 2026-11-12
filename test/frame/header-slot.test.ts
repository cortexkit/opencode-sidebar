import { expect, test } from 'bun:test'

for (const [phase, description, count] of [
  ['static', 'muted and filled afterBadge markers in every collapse mode', 11],
  ['live', 'afterBadge slot clicks and live signal and theme updates', 4],
] as const) {
  test(`shared sidebar preserves ${description}`, async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        '--conditions=browser',
        '--preload',
        '@opentui/solid/runtime-plugin-support',
        'test/frame/header-slot-render.tsx',
        phase,
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: '' })
    expect(stdout).toContain(
      `${count} afterBadge ${phase} golden frames matched`,
    )
  }, 30_000)
}
