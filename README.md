# @cortexkit/opencode-sidebar

A shared OpenCode sidebar frame for CortexKit plugins. It draws the header,
account rows, quota windows and plugin-owned sections. It does not fetch data,
format quotas, read the host theme or store collapse state.

Magic Context and AFT can use it without an auth library. Auth plugins keep using
`@cortexkit/common-auth/quota-sidebar`.

## Compile with the host runtime

This package ships TSX source and TypeScript declarations, not compiled JavaScript.
Precompile it into your plugin's TUI output with the OpenTUI Solid transform.
Bind `@opentui/core`, `@opentui/solid` and `solid-js` to the host's single runtime.
Do not load the TSX directly from `node_modules`, bundle another Solid copy or
substitute `solid-js/web`. A second runtime can paint once and then stop updating.

The TSX names no JSX import source of its own. Tests that import it outside your
build (for example `bun test` rendering the frame) need the same setup as the
build: run it through the OpenTUI Solid transform, with `jsxImportSource` set to
`@opentui/solid`. Otherwise Bun compiles it as React JSX and the render fails.

Peers: OpenTUI core and Solid integration `>=0.4.5`, and Solid `>=1.9.12 <2`.

## Usage

```tsx
import {
  SidebarFrame,
  SidebarSection,
  SidebarStatRow,
} from '@cortexkit/opencode-sidebar'
import { createSignal } from 'solid-js'

export function Panel() {
  const [collapsed, setCollapsed] = createSignal(false)
  return (
    <SidebarFrame
      header={{ badge: 'MY PLUGIN', version: 'v1' }}
      accounts={[]}
      appearance={{
        barWidth: 10,
        barFilledChar: '█',
        barEmptyChar: '░',
        warnThreshold: 70,
        errorThreshold: 90,
      }}
      theme={{ text: '#eeeeee', accent: '#55aaff', background: '#101010' }}
      now={Date.now()}
      showQuota={false}
      collapsed={collapsed()}
      collapsible
      onToggle={() => setCollapsed((value) => !value)}
      sections={() => (
        <SidebarSection title='Activity'>
          <SidebarStatRow label='Mode' value='ready' />
        </SidebarSection>
      )}
    />
  )
}
```

The caller controls the panel state. By default, the header toggles only when the
panel has accounts. Set `collapsible={true}` to enable the toggle without accounts.
Set it to `false` to keep a panel expanded with or without accounts.
When `collapsed={true}`, the panel shows `collapsedSections`, not `sections`.
Without accounts or `collapsedSections`, only the header row shows.

For account panels, pass fixed view data in `AccountView`. Compute `hasQuota`,
`collapsedQuotaText` and `quotaAge` for the same `now` you pass to the frame.
`hasQuota` means at least one known reading, not merely a nonempty group.
Expanded groups take `SidebarWindowPart` rows and optional `PaceView` overlays.
All strings are already formatted by the caller. `background` is the badge's
text colour on `accent`; it is not a panel background.

## Exports

The root export includes `SidebarFrame`, `SidebarSection`, `SidebarStatRow`,
`SidebarGaugeRow` and `SidebarTextRow`. Types: `AccountView`, `QuotaGroupView`,
`SidebarWindowPart`, `PaceView`, `SidebarFrameProps`, `SidebarGaugeRowProps`,
`SidebarTheme`, `SidebarAppearance` and `Tone`.

### Percentage row

Use `SidebarGaugeRow` in a frame for a value without quota windows:

```tsx
<SidebarGaugeRow label='ctx' used={55} value='483K/872K' warnAt={70} errorAt={85} />
```

`SidebarGaugeRowProps` has these props: `label: string`, `used?: number`,
`value?: string`, `warnAt?: number` and `errorAt?: number`.
The row shows `label`, a used bar, and the rounded percentage left.
Optional text shows at the right. The row keeps the `used` percentage in the
0–100 range. A missing or non-finite value shows `no reading` without a bar.

The bar uses the frame's `appearance.barWidth` (10 for a 10-cell bar), characters
and theme tones. Thresholds default to the frame's appearance.
The row cuts the optional text first. At narrow widths, it cuts or removes the
bar, then cuts `label` to keep the percentage in view.

## Development

Use Node 24 and Bun 1.4.4. Run `bun install --frozen-lockfile`, then
`scripts/gate.sh --fast`. The full `scripts/gate.sh` also runs tests and scratch
installs at the OpenTUI 0.4.5 peer floor and 0.5.11. Release preparation uses
`scripts/release.sh <version> [--dry]`. Only the tag-driven `release.yaml`
workflow publishes, after CI passes on that exact commit.
