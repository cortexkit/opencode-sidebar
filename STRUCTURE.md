# Structure

```
src/index.tsx            the frame, its rows and its public types
test/frame/              rendered-frame tests and their goldens
test/import-rule.test.ts the host-runtime import rule
test/release.test.js     release script, CI verifier and gate flag tests
scripts/                 gate, runtime-floor checks, release tooling
.github/workflows/       CI and the tag-driven release
```

## Where to add code

- **A new row or component:** in `src/index.tsx`, exported from the root, reading the
  frame's context. Add a rendered test in `test/frame/` with goldens at the widths the
  other tests cover, both collapsed and expanded.
- **A new prop:** optional, with today's behaviour as the default, so existing plugins
  render byte-identical frames. A test proves both the default and the new value.
- **An account-less panel:** set `SidebarFrame.collapsible` to enable the toggle.
  Use `SidebarGaugeRow` for a percentage without quota windows. It uses the same
  bar segments as quota rows. Its goldens also include 38 columns and a long status.
- **A new import:** only from `@opentui/core`, `@opentui/solid` (and its documented
  subpaths) or `solid-js`. Anything else breaks every consumer's compiled panel; the
  import-rule test refuses it.
- **A raised peer floor:** change `scripts/check-floor.mjs` and `peerDependencies`
  together.
