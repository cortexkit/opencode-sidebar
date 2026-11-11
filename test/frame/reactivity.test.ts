import { expect, test } from 'bun:test'

for (const [phase, description] of [
  ['gauge-parity', 'matching quota and gauge bar characters and tones'],
  ['first-frame', 'the first frame without settling'],
  ['appearance', 'the next frame after live appearance changes'],
  ['theme', 'live theme clearing and restoration, matching fresh colours'],
  ['width', 'a live bar width change from 10 to 40, matching a fresh frame'],
  ['account', 'live account text, age and controlled collapse changes'],
  [
    'gauge-theme',
    'gauge theme clearing and restoration, matching fresh colours',
  ],
  ['gauge-values', 'gauge readings, custom thresholds and appearance changes'],
] as const) {
  test(`shared sidebar draws quota bars on ${description}`, async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        '--conditions=browser',
        '--preload',
        '@opentui/solid/runtime-plugin-support',
        'test/frame/reactivity-render.tsx',
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
    expect(stdout).toContain(`sidebar ${phase} frame passed`)
  }, 30_000)
}
