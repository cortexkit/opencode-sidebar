import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  SidebarFrame,
  SidebarTextRow,
  type SidebarTheme,
} from '@cortexkit/opencode-sidebar'
import { type JSX, testRender } from '@opentui/solid'
import { createSignal, getOwner } from 'solid-js'
import { NOW } from './cases.js'
import { appearance, theme } from './render-support.js'

const phase = process.argv[2]
const warning = '⚠ git features off'
const height = 6
let checked = 0
type View = Awaited<ReturnType<typeof testRender>>

async function snapshot(view: View, key: string) {
  for (let pass = 0; pass < 3; pass++) await view.renderOnce()
  const chars = view.captureCharFrame()
  const spans = `${JSON.stringify(view.captureSpans())}\n`
  const directory = new URL('./goldens/', import.meta.url)
  if (process.argv.includes('--update')) {
    await mkdir(directory, { recursive: true })
    await writeFile(new URL(`${key}.txt`, directory), chars)
    await writeFile(new URL(`${key}.spans`, directory), spans)
  }
  for (const [extension, actual] of [
    ['txt', chars],
    ['spans', spans],
  ] as const) {
    assert.deepEqual(
      Buffer.from(actual, 'utf8'),
      await readFile(new URL(`${key}.${extension}`, directory)),
      `${key}: ${extension}`,
    )
  }
  checked++
  return chars
}

function frame(
  palette: () => SidebarTheme,
  collapsed: () => boolean,
  afterBadge: () => JSX.Element,
  collapsible = true,
  onToggle = () => {},
) {
  return (
    <SidebarFrame
      header={{ badge: 'AFT', version: 'v1', afterBadge }}
      accounts={[]}
      theme={palette()}
      appearance={appearance}
      now={NOW}
      showQuota={false}
      collapsed={collapsed()}
      collapsible={collapsible}
      onToggle={onToggle}
      sections={() => <SidebarTextRow text='expanded content' />}
      collapsedSections={() => <SidebarTextRow text='collapsed content' />}
    />
  )
}

if (phase === 'static') {
  for (const [name, palette] of [
    ['full', theme],
    ['sparse', { text: theme.text }],
  ] as const) {
    for (const collapsed of [false, true]) {
      for (const width of [26, 42]) {
        const state = collapsed ? 'collapsed' : 'expanded'
        const view = await testRender(
          () =>
            frame(
              () => palette,
              () => collapsed,
              () => (
                <text
                  marginLeft={1}
                  fg={'textMuted' in palette ? palette.textMuted : palette.text}
                >
                  {warning}
                </text>
              ),
            ),
          { width, height },
        )
        try {
          const chars = await snapshot(
            view,
            `after-badge-muted-${name}-${state}-${width}`,
          )
          assert.ok(chars.includes(`${state} content`))
          assert.ok(!chars.includes('…'), 'the frame must not fit plugin text')
          if (width === 42) {
            const header = chars.split('\n')[0] ?? ''
            assert.match(header, /[▶▼] AFT {2}⚠ git features off +v1/u)
          }
        } finally {
          view.renderer.destroy()
        }
      }
    }
  }
  for (const collapsed of [false, true]) {
    const view = await testRender(
      () =>
        frame(
          () => theme,
          () => collapsed,
          () => (
            <box
              marginLeft={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={theme.warning}
            >
              <text fg={theme.background}>DEGRADED</text>
            </box>
          ),
        ),
      { width: 42, height },
    )
    try {
      const chars = await snapshot(
        view,
        `after-badge-filled-${collapsed ? 'collapsed' : 'expanded'}-42`,
      )
      assert.match(chars.split('\n')[0] ?? '', /AFT {3}DEGRADED +v1/u)
    } finally {
      view.renderer.destroy()
    }
  }
  const fixed = await testRender(
    () =>
      frame(
        () => theme,
        () => true,
        () => (
          <text marginLeft={1} fg={theme.textMuted}>
            {warning}
          </text>
        ),
        false,
        () => assert.fail('a non-collapsible header must not toggle'),
      ),
    { width: 42, height },
  )
  try {
    const chars = await snapshot(fixed, 'after-badge-non-collapsible-42')
    assert.ok(chars.includes('expanded content'))
    assert.doesNotMatch(chars, /[▶▼]/u)
    await fixed.mockMouse.click(10, 0)
    for (let pass = 0; pass < 3; pass++) await fixed.renderOnce()
    assert.equal(fixed.captureCharFrame(), chars)
  } finally {
    fixed.renderer.destroy()
  }
} else if (phase === 'live') {
  const [collapsed, setCollapsed] = createSignal(false)
  const [marker, setMarker] = createSignal(warning)
  const [palette, setPalette] = createSignal<SidebarTheme>(theme)
  let clicks = 0
  let mounts = 0
  const view = await testRender(
    () => {
      mounts++
      return frame(
        palette,
        collapsed,
        () => {
          assert.ok(getOwner(), 'the slot must execute under a Solid owner')
          return (
            <text marginLeft={1} fg={palette().textMuted}>
              {marker()}
            </text>
          )
        },
        true,
        () => {
          clicks++
          setCollapsed((value) => !value)
        },
      )
    },
    { width: 42, height },
  )
  try {
    const initial = await snapshot(view, 'after-badge-live-initial-42')
    assert.ok(initial.includes('expanded content'))
    const slotX = Bun.stringWidth(
      (initial.split('\n')[0] ?? '').split('⚠')[0] ?? '',
    )
    await view.mockMouse.click(slotX + 2, 0)
    const clicked = await snapshot(view, 'after-badge-live-clicked-42')
    assert.equal(clicks, 1)
    assert.ok(clicked.includes('▶ AFT'))
    assert.ok(clicked.includes('collapsed content'))
    setMarker('git features restored')
    const updated = await snapshot(view, 'after-badge-live-signal-42')
    assert.ok(updated.includes('git features restored'))
    assert.ok(!updated.includes(warning))
    setPalette({ ...theme, textMuted: theme.success })
    const rethemed = await snapshot(view, 'after-badge-live-theme-42')
    assert.equal(rethemed, updated, 'theme changes must preserve text')
    assert.equal(mounts, 1, 'updates must not remount the frame')
    await view.mockMouse.click(2, 0)
    for (let pass = 0; pass < 3; pass++) await view.renderOnce()
    assert.equal(clicks, 2)
    assert.ok(view.captureCharFrame().includes('expanded content'))
  } finally {
    view.renderer.destroy()
  }
} else {
  throw new Error(`Unknown phase: ${phase}`)
}
console.log(`${checked} afterBadge ${phase} golden frames matched`)
