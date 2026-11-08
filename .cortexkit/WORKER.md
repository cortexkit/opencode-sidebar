# Standing rules for workers

Anything not listed here comes to the repository maintainer as a question.

## Build and test
- Run only the tests for the files and behaviour you changed (`bun test <file> -t <name>`), plus `scripts/gate.sh --fast` before every commit. Report its final line and wall time. For a bug fix, show one test failing without the fix in an isolated copy under `target/scratch/`.
- Never run the whole suite or full gate unless the brief asks. The repository maintainer runs the full gate over merged deliveries. Narrow a filtered run that takes more than about 15 minutes.
- Use Node 24 and Bun 1.4.4, as in CI. Install with `bun install --frozen-lockfile`. `bun run build` emits declarations only; consumers compile the shipped TSX. `bun run types` checks source and tests. `bun run lint` checks lint and formatting; `bun run format:check` checks formatting alone.
- The full gate adds `bun test`, `bun run check:floor` (OpenTUI 0.4.5 / Solid 1.9.12), and `bun run check:opentui-0511`. Compatibility installs stay under `target/scratch/` and are removed after the run.
- CI runs the full gate on Linux, macOS and Windows, and tests on Bun 1.3.14, 1.4.2 and 1.4.4. Report changes to paths or process spawning so the repository maintainer can check the Windows workflow.
- Source imports must stay within `src/` or use the host OpenTUI/Solid modules allowed by `test/import-rule.test.ts`. Never add `solid-js/web` or a runtime dependency.

## Report-only tasks
- Reports under `.cortexkit/internal-docs/` need no gate or commit. Deliver with the existing HEAD.

## Pre-approved (do it, then report it)
- Regenerate `bun.lock` after an approved manifest change.
- Add test-only helpers outside published source.
- Format with Biome and fix lint in touched files.
- Update comments for behaviour you changed.
- Correct a test that contradicts the brief and explain why in the report.

## Never
- Loosen assertions, skip tests, or raise timeouts without timing evidence.
- Commit scratch output or force-add anything under `.cortexkit/`. This file is allowed by `.gitignore`.
- Read or write the operator's real config, OpenCode folders or vault.
- Push, tag, publish, or post on GitHub.
- Change user-visible wording, public props or rendering policy beyond the brief without asking.

## Comments
Explain the reason for a reader with no context. No task ids or references to a conversation.
