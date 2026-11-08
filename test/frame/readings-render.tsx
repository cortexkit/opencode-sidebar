import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  type AccountView,
  SidebarFrame,
  type SidebarWindowPart,
} from '@cortexkit/opencode-sidebar'
import { NOW } from './cases.js'
import { appearance, capture, theme } from './render-support.js'

const limit = (
  label: string,
  _windowMinutes: number,
  remainingPercent?: number,
): SidebarWindowPart => ({
  kind: 'window',
  reading: remainingPercent === undefined ? 'unknown' : 'known',
  name: label,
  short: label,
  figure:
    remainingPercent === undefined ? 'no reading' : `${remainingPercent}% left`,
  remainingPercent,
  checkedAt: NOW,
  resetIn: '2h',
  resetSinceReading: false,
})
const inputs = [
  {
    name: 'mixed-readings',
    limits: [limit('5h', 300, 75), limit('7d', 10080)],
  },
  { name: 'all-no-reading', limits: [limit('5h', 300), limit('7d', 10080)] },
  { name: 'fully-used', limits: [limit('5h', 300, 0)] },
]
function account(limits: SidebarWindowPart[]): AccountView {
  return {
    id: 'one',
    label: 'account',
    status: { text: 'ready', tone: 'success' },
    blocked: false,
    indicatorTone: 'accent',
    hasQuota: limits.some((part) => part.reading === 'known'),
    collapsedQuotaText:
      limits[0]?.remainingPercent === 0 ? 'Fa 5h 0% left' : 'Fa 5h 75% left',
    groups: [
      {
        title: 'Fable',
        rows: limits.map((part) => ({
          part,
        })),
      },
    ],
  }
}
async function draw(value: AccountView, collapsed = false, width = 42) {
  return capture(
    () => (
      <SidebarFrame
        header={{ badge: 'TEST', version: 'v1' }}
        accounts={[value]}
        theme={theme}
        appearance={appearance}
        now={NOW}
        showQuota={true}
        collapsed={collapsed}
        onToggle={() => {}}
      />
    ),
    width,
  )
}
let checked = 0
for (const input of inputs) {
  for (const collapsed of [false, true]) {
    const actual = await draw(account(input.limits), collapsed)
    const lines = actual.chars.split('\n').map((line) => line.trim())
    if (!collapsed && input.name !== 'fully-used') {
      assert.ok(
        lines.includes('7d no reading'),
        `missing no reading row\n${actual.chars}`,
      )
      if (input.name === 'all-no-reading') {
        assert.ok(lines.includes('Fable') && lines.includes('5h no reading'))
        assert.ok(!/[█░%]/u.test(actual.chars) && !actual.chars.includes('2h'))
      }
      for (const line of actual.spans.lines.filter((line) =>
        line.spans.some((span) => span.text.includes('no reading')),
      )) {
        for (const span of line.spans.filter((span) => span.text.trim())) {
          assert.deepEqual(span.fg, theme.textMuted, 'no reading row is muted')
        }
      }
    }
    if (!collapsed && input.name === 'fully-used') {
      assert.ok(
        lines.some(
          (line) =>
            line.startsWith('5h ██████████ 0% left') && line.endsWith('2h'),
        ),
      )
      const figure = actual.spans.lines
        .flatMap((line) => line.spans)
        .find((span) => span.text.includes('0% left'))
      assert.deepEqual(figure?.fg, theme.error)
    }
    if (collapsed) {
      assert.ok(
        !actual.chars.includes('no reading') && !actual.chars.includes('7d'),
      )
      if (input.name === 'mixed-readings')
        assert.ok(actual.chars.includes('Fa 5h 75% left ●'))
      if (input.name === 'all-no-reading')
        assert.ok(lines.some((line) => /^account +— ●$/u.test(line)))
    }
    const key = `${input.name}-${collapsed ? 'collapsed' : 'expanded'}-42`
    if (process.argv.includes('--update')) {
      await mkdir(new URL('./goldens/', import.meta.url), { recursive: true })
      await writeFile(
        new URL(`./goldens/${key}.txt`, import.meta.url),
        actual.chars,
      )
      await writeFile(
        new URL(`./goldens/${key}.spans`, import.meta.url),
        `${JSON.stringify(actual.spans)}\n`,
      )
    }
    assert.deepEqual(
      Buffer.from(actual.chars),
      await readFile(new URL(`./goldens/${key}.txt`, import.meta.url)),
      `${key}: raw UTF-8 frame`,
    )
    assert.deepEqual(
      Buffer.from(`${JSON.stringify(actual.spans)}\n`),
      await readFile(new URL(`./goldens/${key}.spans`, import.meta.url)),
      `${key}: style spans`,
    )
    checked++
  }
}

// An unknown state suppresses leftover figures, resets and pace in composed parts.
const value = account([limit('5h', 300, 75)])
const part = value.groups[0]?.rows[0]?.part
if (!part) throw new Error('Expected a reported part')
for (const width of [16, 42]) {
  for (const name of ['', '5h']) {
    const actual = await draw(
      {
        ...value,
        groups: [
          {
            rows: [
              {
                part: { ...part, name, reading: 'unknown' as const },
                pace: { text: 'old pace', tone: 'warning' },
              },
            ],
          },
        ],
      },
      false,
      width,
    )
    assert.ok(
      actual.chars
        .split('\n')
        .some((line) => line.trim() === `${name ? `${name} ` : ''}no reading`),
    )
    assert.ok(
      !/[█░%]/u.test(actual.chars) &&
        !actual.chars.includes('2h') &&
        !actual.chars.includes('old pace'),
    )
  }
}
console.log(`${checked} reading-state frames and style spans matched`)
