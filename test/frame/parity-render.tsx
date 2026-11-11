import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cases, NOW, widths } from './cases.js'
import { ParityFrame } from './parity-frame.js'
import { capture } from './render-support.js'

Date.now = () => NOW
let checked = 0
for (const input of cases) {
  for (const collapsed of [false, true]) {
    for (const width of input.widths ?? widths) {
      const key = `${input.name}-${collapsed ? 'collapsed' : 'expanded'}-${width}`
      const actual = await capture(
        () => <ParityFrame input={input} collapsed={collapsed} />,
        width,
      )
      if (input.gauges) {
        const lines = actual.chars.split('\n').filter((line) => line.trim())
        assert.ok(
          lines.every((line) => Bun.stringWidth(line) <= width),
          key,
        )
        if (collapsed) {
          assert.equal(lines.length, 1, key)
          assert.ok(lines[0]?.includes('▶ TEST'), key)
        } else {
          for (const text of ['45% left', '100% left', '0% left', 'no reading'])
            assert.ok(actual.chars.includes(text), `${key}: ${text}`)
          if (width >= 36)
            assert.ok(actual.chars.includes('██████░░░░ 45% left'), key)
          assert.ok(
            actual.chars.includes('…'),
            `${key}: long status must be fitted`,
          )
        }
      }
      if (
        process.argv.includes('--update') ||
        (input.gauges && process.argv.includes('--update-new'))
      ) {
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
      const expected = await readFile(
        new URL(`./goldens/${key}.txt`, import.meta.url),
      )
      assert.deepEqual(
        Buffer.from(actual.chars, 'utf8'),
        expected,
        `${key}: raw UTF-8 frame`,
      )
      assert.deepEqual(
        Buffer.from(`${JSON.stringify(actual.spans)}\n`, 'utf8'),
        await readFile(new URL(`./goldens/${key}.spans`, import.meta.url)),
        `${key}: style spans`,
      )
      checked++
    }
  }
}
console.log(`${checked} frozen shared frames and style spans matched`)
