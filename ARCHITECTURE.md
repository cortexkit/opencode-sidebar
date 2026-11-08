# Architecture

## Purpose

`@cortexkit/opencode-sidebar` draws the shared OpenCode sidebar panel that CortexKit
plugins show: a header with a badge and version, optional account rows with quota bars,
and plugin-owned sections. It is a pure view. It fetches nothing, formats no quota, reads
no host theme API and stores no state. Each plugin computes the strings and colours and
passes them in.

The auth plugins use it through common-auth's `./quota-sidebar`, which turns projected
quota into this package's view data. Plugins without accounts (Magic Context, AFT) use it
directly.

## Terms

- **Frame:** `SidebarFrame`, the root component. Every other component must render inside
  it, because they read the frame's context.
- **Account view:** `AccountView`, one account's precomputed display data: label, status,
  indicator tone, quota groups, and the three collapsed-row values `hasQuota`,
  `collapsedQuotaText` and `quotaAge`.
- **Window part:** `SidebarWindowPart`, one quota row's display data (name, short name,
  figure, remaining percentage, reset span, reading time). common-auth's `QuotaWindowPart`
  has the same fields.
- **Pace overlay:** an optional band on a bar showing elapsed window time against usage
  (`reserve` or `deficit`).
- **Appearance:** bar width, bar characters and the warning and error thresholds.
- **Host runtime:** the single OpenTUI and Solid instance the OpenCode host provides.

## Code map

| Path | What it holds |
| --- | --- |
| `src/index.tsx` | The whole package: types, `SidebarFrame`, `SidebarSection`, `SidebarStatRow`, `SidebarTextRow`, and the internal quota, collapsed and account rows. |
| `test/frame/` | Rendered-frame tests on fixed view data, with byte-exact goldens (characters and style spans) at 16, 36, 37 and 42 columns. |
| `test/import-rule.test.ts` | Fails on any import outside the host runtime. |
| `scripts/check-runtime.mjs` | Runs the typecheck and frame tests in a scratch install of a given OpenTUI and Solid version. `check-floor.mjs` (0.4.5) and `check-opentui-0511.mjs` (0.5.11) call it. |
| `scripts/gate.sh` | `--fast`: install check, build, types, lint, format. Full: also tests and both runtime checks. |
| `scripts/release.sh`, `scripts/verify-ci.mjs`, `scripts/version.mjs` | Release preparation, and the check that CI passed on the exact tagged commit. |
| `.github/workflows/` | CI (full gate on Linux, macOS and Windows; tests on Bun 1.3.14, 1.4.2 and 1.4.4) and the tag-driven release. |

## Mechanisms

**Consumers compile the source.** The package ships `src/index.tsx` and declarations, not
JavaScript. Each plugin compiles it into its own TUI output with the Solid transform, and
binds OpenTUI and Solid to the host runtime. A component loaded uncompiled from
`node_modules`, or rendered by a second Solid copy, paints once and then stops updating.
So the source imports only `@opentui/core`, `@opentui/solid` and `solid-js`, and
`test/import-rule.test.ts` enforces it.

**Context.** `SidebarFrame` provides its props (with the theme filled in) through a Solid
context. `SidebarSection`, `SidebarStatRow` and `SidebarTextRow` throw outside a frame, so
a plugin can't render them with no theme or appearance.

**Theme fallback.** A missing `textMuted`, `accent`, `success`, `warning` or `error` takes
`text`; an unset theme leaves terminal defaults. The badge is inverted (`background` text
on `accent`) only when both are set, because inverting a partial palette can put light text
on a light background. `background` is used for nothing else.

**Collapse is controlled.** The frame takes `collapsed` and `onToggle`. A click on the
header toggles only when there are accounts. Without accounts the frame always shows its
expanded sections.

**Fitting text to the width.** Rows measure their own width (`onSizeChange`) and cut text
with `…` by display width (`Bun.stringWidth` when present). A stat row keeps its label whole
and shortens the value. A collapsed account row keeps its quota text only when it fits
with room for an ellipsis, a space and the trailing indicator. Otherwise it drops the quota
and shows the label and indicator, and the label is shortened first. The frame's own text
does not wrap; `SidebarTextRow` wraps only when the plugin passes a `wrapMode`.

**Bars.** A bar is a fixed number of cells (`barWidth`) toned by usage against the two
thresholds. A pace overlay replaces the cells between usage and elapsed time. The segment
list keeps the same number of slots with or without an overlay, so a live pace change
updates existing text nodes instead of creating new ones.

## Invariants

- The source imports only the host runtime packages, and nothing outside `src/`.
- No quota, host or storage knowledge: every value the frame shows comes from its props.
- The peer floor (`@opentui/*` 0.4.5, Solid 1.9.12) is what `check-floor.mjs` tests; raise
  the declared floor only together with that check.
- Golden frames are byte-exact on every OS (`.gitattributes` keeps LF). A changed golden is
  a visible change for every plugin's panel.

## Failure handling

- Missing theme colours fall back as above; nothing throws for an incomplete theme.
- A component used outside `SidebarFrame` throws a fixed error naming the cause.
- `scripts/release.sh` takes only a version and `--dry`, and refuses anything else. The
  release workflow publishes only after CI passed on the exact tagged commit, through npm
  trusted publishing with provenance.
