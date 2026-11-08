import assert from 'node:assert/strict'
import {
  type AccountView,
  type SidebarAppearance,
  SidebarFrame,
  type SidebarTheme,
} from '@cortexkit/opencode-sidebar'
import { testRender } from '@opentui/solid'
import { createSignal } from 'solid-js'
import { firstPart, NOW, secondPart } from './cases.js'
import { appearance, theme } from './render-support.js'

const phase = process.argv[2]
const account: AccountView = {
  id: 'main',
  label: 'main',
  status: { text: 'active', tone: 'success' },
  blocked: false,
  indicatorTone: 'accent',
  hasQuota: true,
  collapsedQuotaText: '5h 60% · 7d 30% left',
  groups: [
    {
      rows: [firstPart, secondPart].map((part, index) => ({
        part,
        pace:
          phase === 'theme' && index === 0
            ? {
                text: '',
                tone: 'error',
                overlay: { kind: 'deficit', percent: 60 },
              }
            : undefined,
      })),
    },
  ],
}
const [prefs, setPrefs] = createSignal(appearance)
const [palette, setPalette] = createSignal<SidebarTheme>(theme)
const [data, setData] = createSignal(account)
const [collapsed, setCollapsed] = createSignal(false)
function mountSidebar(
  palette: () => SidebarTheme,
  prefs: () => SidebarAppearance,
  onMount = () => {},
) {
  return testRender(
    () => {
      onMount()
      return (
        <SidebarFrame
          header={{ badge: 'TEST' }}
          accounts={[data()]}
          theme={palette()}
          appearance={prefs()}
          now={NOW}
          showQuota={true}
          collapsed={collapsed()}
          onToggle={() => {}}
        />
      )
    },
    { width: 60, height: 20 },
  )
}
let mounts = 0
const view = await mountSidebar(palette, prefs, () => mounts++)
async function snapshot(view: Awaited<ReturnType<typeof mountSidebar>>) {
  for (let pass = 0; pass < 3; pass++) await view.renderOnce()
  return {
    chars: view.captureCharFrame(),
    glyphs: view
      .captureSpans()
      .lines.flatMap((line) =>
        line.spans.flatMap((span) =>
          [...span.text]
            .filter((char) => /[█░▓▒]/u.test(char))
            .map((char) => ({ char, fg: span.fg })),
        ),
      ),
  }
}
async function matchesFresh(label: string) {
  const actual = await snapshot(view)
  const fresh = await mountSidebar(palette, prefs)
  try {
    const expected = await snapshot(fresh)
    assert.equal(actual.chars, expected.chars, `${label}: text`)
    assert.deepEqual(
      actual.glyphs,
      expected.glyphs,
      `${label}: bar foregrounds`,
    )
    assert.equal(mounts, 1, `${label}: live frame must stay on one mount`)
    return actual
  } finally {
    fresh.renderer.destroy()
  }
}
try {
  // Do not settle layout: hosts can paint immediately after mounting the frame.
  await view.renderOnce()
  if (phase === 'first-frame') {
    const frame = view.captureCharFrame()
    assert.match(frame, /5h ████░░░░░░ 60% left/, 'first frame lost the 5h bar')
    assert.match(frame, /7d ███████░░░ 30% left/, 'first frame lost the 7d bar')
    assert.match(frame, /60% left\s+4h/)
  } else if (phase === 'appearance') {
    setPrefs({
      barWidth: 15,
      barFilledChar: '#',
      barEmptyChar: '.',
      warnThreshold: 30,
      errorThreshold: 60,
    })
    await view.renderOnce()
    const frame = view.captureCharFrame()
    assert.match(frame, /5h ######\.\.\.\.\.\.\.\.\. 60% left/)
    assert.match(frame, /7d ###########\.\.\.\. 30% left/)
    const spans = view.captureSpans().lines.flatMap((line) => line.spans)
    for (const [text, tone] of [
      ['######.........', 'warning'],
      ['###########....', 'error'],
    ] as const) {
      const bar = spans.find((span) => span.text.includes(text))
      assert.ok(bar, `live appearance lost the ${tone} bar`)
      assert.deepEqual(bar.fg, theme[tone], `live ${tone} threshold colour`)
    }
    assert.doesNotMatch(frame, /█|░/)
  } else if (phase === 'theme') {
    for (const [label, next] of [
      ['full theme', theme],
      ['cleared theme', {}],
      ['restored theme', theme],
    ] as const) {
      setPalette(next)
      const actual = await matchesFresh(label)
      assert.equal(actual.glyphs.length, 20, `${label}: all bar glyphs present`)
      assert.ok(actual.glyphs.some(({ char }) => char === '▓'))
    }
  } else if (phase === 'width') {
    const before = await matchesFresh('width 10')
    assert.equal(before.glyphs.length, 20)
    setPrefs({ ...appearance, barWidth: 40 })
    const after = await matchesFresh('width 40')
    assert.equal(after.glyphs.length, 80)
    assert.notEqual(after.chars, before.chars)
  } else if (phase === 'account') {
    setData({
      ...account,
      hasQuota: false,
      quotaAge: 'checked 1h ago',
      groups: [],
      emptyQuotaText: { expanded: 'checking…', collapsed: 'checking…' },
    })
    const expanded = await snapshot(view)
    assert.ok(expanded.chars.includes('checking…'))
    assert.ok(expanded.chars.includes('checked 1h ago'))
    assert.doesNotMatch(expanded.chars, /60% left/)
    setCollapsed(true)
    assert.ok((await snapshot(view)).chars.includes('checking… ●'))
    setData({ ...account, collapsedQuotaText: '' })
    const emptyText = await snapshot(view)
    assert.ok(emptyText.chars.includes('main'))
    assert.ok(emptyText.chars.includes('●'))
    assert.ok(
      !emptyText.chars.includes('checking') && !emptyText.chars.includes('—'),
    )
    setData({ ...account, collapsedQuotaText: 'live quota text' })
    assert.ok((await snapshot(view)).chars.includes('live quota text ●'))
    assert.equal(mounts, 1)
  } else {
    throw new Error(`Unknown phase: ${phase}`)
  }
} finally {
  view.renderer.destroy()
}
console.log(`sidebar ${phase} frame passed`)
