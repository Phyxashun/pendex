# AGENTS.md

Guidance for any coding agent (or human) working in this repo. Read
this before making changes — it captures conventions, known gotchas,
and the reasoning behind non-obvious structure so they don't get
re-litigated or silently reverted.

## What this is

Pendex (`px`) is a CLI that compiles a project's source tree into
banner-delimited `.txt` archives grouped by job category (source, web,
style, terminal, configuration, documentation, testing, misc), and a
`px split` command that reconstructs the original tree from those
archives plus a manifest. Primary use case: packaging a project for
LLM context windows. See `README.md` for the user-facing pitch and
usage; this file is about _working on_ the codebase, not using it.

## Monorepo layout

Bun workspaces, strictly acyclic package graph:

```
@pendex/color → @pendex/theme → @pendex/core → @pendex/compile + @pendex/split → root pendex CLI (src/)
                                                                  @pendex/home (website, depends on nothing above)
```

- `@pendex/core` holds shared contracts: types, `ArchiveFormat`,
  `FileScanner`, `View`, `ConfigManager`, `bootstrap.resolveRunnerDeps()`.
- `@pendex/compile` and `@pendex/split` each have standalone entry
  points (`Compile.ts` / `Split.ts`) that resolve their own deps via
  `@pendex/core`'s `bootstrap.ts` — they do **not** depend on the root
  shell package. This lets them run outside the interactive menu.
- `@pendex/home` is the whole website (marketing home page **and** the
  user guide + generated API reference, merged into one package — see
  "The website" below). It has no relationship to the CLI packages
  other than living in the same workspace.
- Cross-package round-trip tests live at the repo root (`tests/integration.test.ts`).
- Root `src/` is the CLI shell: `App.ts` (menu orchestrator), `commands/`
  (thin containers), `components/`, `utils/`.

**Never introduce a cycle.** If you find yourself importing from a
package "above" the current one in that chain, the code belongs
somewhere else — usually `@pendex/core`.

## Architecture pattern: core = hooks, views = components, commands = containers

Borrow the React mental model even though this is a CLI:

- **Core / Service** layer = pure logic (hooks). No `@clack/prompts`
  calls, no console output. Testable without mocking a terminal.
- **View** layer = the thing that owns a full `@clack/prompts` session,
  **intro through outro**. Every exit path (success, error, early
  return) must close the session it opened. A view that opens `intro()`
  but leaves `outro()` to its caller is a bug waiting to happen — see
  "Bugs found and fixed" below for what that looked like in practice.
- **Command** layer = thin wiring between a menu entry and a view/service.
  If a command is doing real logic, that logic belongs one layer down.

Don't split into command + service + view for something trivial. `Exit`
is deliberately a single file — one `outro()` and a `process.exit()`
don't earn three files.

## The archive format

`ArchiveFormat.ts`'s `parseArchive()` is a path-matched frame state
machine. Content is preserved verbatim between banner frames —
byte-perfect round trips including trailing newlines and empty files.
Inner frames (an archive nested inside another archive's content, e.g.
when self-hosting) carry inner paths and cannot falsely terminate outer
entries. If you touch this file, the round-trip and self-hosting tests
in `packages/core/tests/archiveformat.test.ts` and
`tests/integration.test.ts` are the ones that matter most — verbatim
byte-fidelity is the entire point of the format.

## Themes

- `packages/theme/themes/pendex.toml` is the **canonical** theme. Every
  other theme file (`dracula.toml`, `tokyonight.toml`, `onedark.toml`,
  `monokaipro.toml`) must mirror its exact section layout — same tables,
  same keys, different values.
- A theme name is the file stem under `packages/theme/themes/` (e.g.
  `"pendex"`, `"dracula"`) — not a dark/light binary. `ThemeManager`
  degrades to the built-in brand palette for unknown/missing/malformed
  themes rather than crashing; the theme is cosmetic and must never
  take the app down.
- **The shipped default config's `theme` value must name a real file
  in `packages/theme/themes/`.** It was `"default"` for a long time
  with no `default.toml` on disk, which silently degraded every fresh
  install to the fallback palette instead of loading `pendex.toml` —
  caught only because a test asserted on it (`packages/core/tests/bootstrap.test.ts`).
  Don't reintroduce a theme name that doesn't correspond to a file.
- `[brand]` table's Category-named keys (`source`, `web`, `style`,
  `terminal`, `configuration`, `documentation`, `testing`, `misc`) drive
  per-job-category color-coding via `categoryStyle()` on the `View`
  base class. `bootstrap.ts`'s `extractCategoryColors()` only keeps keys
  that are literally one of the eight `Category` values — abbreviating
  a key (e.g. `config` instead of `configuration`) silently drops it,
  it doesn't error.
- All palette colors are WCAG-verified against `#1A1A1A` and `#262626`
  backgrounds. Keep new colors verified the same way.

## The website (`@pendex/home`)

One Vite package, one build, two pages, sharing one `pendex` daisyUI
theme (`src/index.css`):

- **`/`** — marketing home page. `index.html` → `src/main.tsx` → `src/App.tsx`.
- **`/docs/`** — user guide + generated API reference. `docs/index.html`
  → `docs/main.tsx` → `src/docs/DocsApp.tsx`. The API reference itself
  (`/docs/api/`) is TypeDoc output written to `public/docs/api/`. It's
  committed to the repo (not gitignored, not touched by `bun run clean`)
  so the site has a working `/docs/api` even without a fresh TypeDoc run;
  it's copied into `dist/docs/api/` automatically because it lives under
  `publicDir`. Regenerate it with `bun run --cwd packages/home docs:api`
  after changing any library package's JSDoc comments.

This used to be two separate workspace packages (`@pendex/home` and
`@pendex/api-docs`) with two Vite configs, deployed together via a
"combine builds" step in CI. They were merged into one package with one
`vite.config.ts` (living in `packages/home/`, not the repo root) and a
two-entry multi-page build. If you're tempted to split the docs back
out into their own package, don't — the whole point of the merge was
one theme, one dependency set, one build pipeline, no drift between
two copies of the same CSS.

**`typescript` is pinned to `5.9.3` inside `packages/home/package.json`**,
overriding the workspace's `7.0.2`, _only_ because TypeDoc has no TS 7
support yet (its own tracking issue says the TS7 API is a ground-up
rewrite with no timeline). Bun nests this version locally rather than
hoisting it, so it doesn't affect any other package. Remove the pin
once TypeDoc supports TS 7 — check `typedoc`'s peer dependency range
before bumping it back.

**Declaration output (`tsc -b`) is redirected to `node_modules/.tmp/types/`**
via `declarationDir` in `tsconfig.app.json` / `tsconfig.node.json`.
Without it, every `.tsx`/`.ts` file gets a same-named `.d.ts` sibling
dumped straight into `src/` on every build — annoying, and it used to
happen silently until lint/format started flagging the generated files
as unformatted source. If you see stray `.d.ts` files next to source
after a build, something regressed this setting.

## Tooling

- **Package manager / runtime: Bun only.** Bun-native APIs in `src/`
  (`Bun.file`, `Bun.write`, `Bun.$`, `Bun.TOML.parse`), no Node-only
  APIs. `devEngines` in the root `package.json` enforces this.
- **TypeScript strict mode, no `any`** — enforced everywhere except two
  explicitly out-of-scope standalone utilities
  (`src/utils/HeaderComments.ts`, `src/utils/update-config.ts`, see
  their `coveragePathIgnorePatterns` entry in `bunfig.toml`).
- **Lint/format: Oxlint + Oxfmt, not ESLint/Prettier.** Configs are
  `.oxlintrc.json` and `.oxfmtrc.json` at the repo root.
  `bun run lint` runs `oxlint --fix` then `oxfmt`; `bun run lint:check`
  / `bun run format:check` run non-mutating versions for CI. ESLint was
  removed because `typescript-eslint` doesn't support TypeScript 7 yet
  (same upstream-lag problem as TypeDoc above) — Oxlint has no such
  gap and is also just faster. Don't reintroduce ESLint/Prettier
  config files; if a new rule is needed, add it to `.oxlintrc.json`.
- **Docs: TypeDoc**, driven by `typedoc.json` + `tsconfig.typedoc.json`
  at the repo root, entry points across all five library packages
  (`color`, `theme`, `core`, `compile`, `split` — not `home`, which
  isn't a library). Output goes to `packages/home/public/docs/api`.

## Commands that matter

```sh
bun install                 # from repo root
bun run typecheck           # tsc --noEmit at root + every package's own typecheck
bun run test                # bun test at root (CLI shell) + every package's own tests
bun run lint                 # oxlint --fix . ; oxfmt .
bun run build                # builds the website (packages/home) — home page + docs + API reference
bun run build:pendex         # typecheck, then compile the CLI to ./dist/px
bun run dev                  # website dev server (both / and /docs)
bun run clean                 # removes build output (dist, coverage, generated API docs, etc.)
bun run start                 # run the interactive CLI shell directly
```

**When you touch `bun --filter` in any script: never combine it with
`run`.** `bun --filter '<pattern>' run <script>` silently matches zero
packages in this Bun version ("No packages matched the filter") and
exits non-zero, while `bun --filter '<pattern>' <script>` (no `run`)
works correctly. This bit us for a long time: the root `test` script's
second half (meant to run every package's own tests) was silently
failing before it ever reached the packages, which hid two real test
failures in `@pendex/core` (the theme-default bug above) for who knows
how long. If a `bun --filter` invocation you add starts reporting
zero matched packages, this is almost certainly why — drop the `run`.

## Testing conventions

- `tests/preload.ts` (root) mocks `@clack/prompts` globally so
  `intro()`/`outro()`/`select()`/etc. never hang waiting for real
  terminal input in tests; `tasks()` still runs each task function for
  real so service-layer work under test actually executes.
- Each package scopes its own `bun test` discovery via `root = "."` in
  its own `bunfig.toml` (`root = "tests"` at the repo root). Without
  this, `bun run --filter '*' test` re-runs the _entire_ workspace
  suite from inside every package and collides on shared sandbox
  directories — this happened before all six `bunfig.toml` files had
  `root` scoping (`@pendex/theme` and `@pendex/color` were missing it).
  If you add a new package, give it a `bunfig.toml` with `root = "."`.
- `Constants.BASE_DIR` / `GITIGNORE_PATH` / `RUNTIME_CONFIG_PATH` are
  **live getters over `process.cwd()`**, not fields frozen at
  module-first-import. This is what makes `process.chdir()` in a test's
  `beforeEach` actually work for sandboxing — don't turn them back into
  plain `readonly` fields computed once.
- Cross-package round-trip fidelity (compile → split byte-perfect,
  including empty directories) is covered in
  `tests/integration.test.ts` at the repo root, not inside either
  package — it's testing the contract _between_ `@pendex/compile` and
  `@pendex/split`, not either one in isolation.

## Dependency policy

- Runtime deps that matter and should stay pinned to roughly these
  major/minor lines unless there's a specific reason to move:
  `typescript@^7.0.2`, `@clack/prompts@^1.7.0`, `tailwindcss@^4.3.3`,
  `daisyui@^5.7.9`, `react@^19.2.8`, `react-dom@^19.2.8`.
- Dev tooling: `@tailwindcss/vite`, `@types/bun`, `@types/react`,
  `@types/react-dom`, `@vitejs/plugin-react`, `vite`, `oxlint`, `oxfmt`.
- PDF export and syntax highlighting are **planned but not wired up
  yet**. Their dependencies (`@pdf-lib/fontkit`, `pdf-lib`, `prismjs`,
  `@types/prismjs`) live in root `optionalDependencies` specifically so
  `bun install` doesn't fail if one of them can't build in some
  environment, and specifically so nothing in `src/`/`packages/*/src`
  imports them yet. Move them to `dependencies` when that feature
  actually starts, not before.
- Before adding a new tool (linter, doc generator, formatter, etc.),
  check its TypeScript peer-dependency range against `^7.0.2` first.
  This repo has hit the "tool doesn't support TS7 yet" wall twice
  already (ESLint's `typescript-eslint`, TypeDoc) — it's a live upstream
  gap across the ecosystem right now, not a one-off.
- Don't add a dependency "just in case." `trash` and `concurrently`
  were both in `package.json` for a long time with zero references
  anywhere in the codebase before being removed — if you add something,
  use it in the same change.

## Known-fixed bugs worth knowing about (don't reintroduce)

- `theme.bold(theme.warning(x))` chaining a not-yet-coerced themed
  value into another chain call throws `Symbol.toPrimitive returned an
object`. Force an intermediate template literal (`` `${...}` ``)
  before passing a themed value into another theme call.
- `Bun.Glob('**/')` doesn't surface directories whose entire subtree
  has zero files. `findEmptyDirectories` in `FileScanner.ts` uses
  `'**/*'` with `onlyFiles: false` / `onlyFiles: true` and a set
  difference instead — don't swap it back to a trailing-slash glob.
- `(this.state.exit() ?? process.exit(0))` calls `exit()` immediately
  (with no args) and, being void-returning, _also_ always fires the
  real `process.exit(0)` via `??` — even with a test mock injected.
  `??` needs to pick a function **reference**, not a call result:
  `(this.state.exit ?? process.exit)(0)`.
- `(value as any).__clackResult = x` where `value` is a string
  primitive is a silent no-op — primitive property writes don't error,
  they just do nothing. Don't mutate primitives and expect it to stick.
- `parsePendexTheme`'s table extraction must reject arrays explicitly —
  `typeof [] === 'object'` in JS, so an unguarded check turns a TOML
  array under a table key into a bogus `{0: ...}` object instead of
  `undefined`.
- `Exit.ts` used to hand-draw its goodbye message with raw
  `console.log('│')` / `console.log('└  ' + msg)` instead of using
  `@clack/prompts`' `outro()` — reinventing clack's own box-drawing
  and leaving the shell's clack session technically still open. It now
  calls `outro()` like every other view.

## Before you commit

1. `bun run typecheck` — zero diagnostics, every package.
2. `bun run test` — every package's tests pass (not just the root half;
   see the `--filter`/`run` warning above if the workspace half seems
   to skip silently).
3. `bun run lint` (or `lint:check` + `format:check` if you don't want
   auto-fixes applied).
4. If you touched `packages/home`: `bun run build` and spot-check
   `packages/home/dist/` has both `index.html` and `docs/index.html`,
   and that `docs/api/` has content.
