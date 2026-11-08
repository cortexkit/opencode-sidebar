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

The caller controls collapse. The header toggles only when accounts exist;
without accounts the frame always shows its expanded sections.

For account panels, pass fixed view data in `AccountView`. Compute `hasQuota`,
`collapsedQuotaText` and `quotaAge` for the same `now` you pass to the frame.
`hasQuota` means at least one known reading, not merely a nonempty group.
Expanded groups take `SidebarWindowPart` rows and optional `PaceView` overlays.
All strings are already formatted by the caller. `background` is the badge's
text colour on `accent`; it is not a panel background.

## Exports

The root export provides `SidebarFrame`, `SidebarSection`, `SidebarStatRow` and
`SidebarTextRow`. Types: `AccountView`, `QuotaGroupView`, `SidebarWindowPart`,
`PaceView`, `SidebarFrameProps`, `SidebarTheme`, `SidebarAppearance` and `Tone`.

## Development

Use Node 24 and Bun 1.4.4. Run `bun install --frozen-lockfile`, then
`scripts/gate.sh --fast`. The full `scripts/gate.sh` also runs tests and scratch
installs at the OpenTUI 0.4.5 peer floor and 0.5.11. Release preparation uses
`scripts/release.sh <version> [--dry]`. Only the tag-driven `release.yaml`
workflow publishes, after CI passes on that exact commit.
