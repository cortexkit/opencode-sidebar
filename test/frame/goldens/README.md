# Frozen frame views

These fixtures use preformatted `AccountView` and `SidebarWindowPart` values.
They do not test common-auth's quota projection or formatting.

The 32 general frames cover widths 16, 36, 37 and 42 in both expanded and
collapsed mode. Six reading-state frames cover known, unknown and exhausted
readings at width 42. Each capture stores raw UTF-8 cells and colour/style spans.
Each frame is borderless, with no outer padding and three layout passes.

To regenerate deliberately:

```sh
bun --preload @opentui/solid/preload test/frame/parity-render.tsx --update
bun --preload @opentui/solid/preload test/frame/readings-render.tsx --update
```

Review the changed characters and spans before committing. Normal tests never
pass `--update`. Focused tests also assert layout, indicators, themes, controlled
collapse, slot order and live prop updates independently of these snapshots.
