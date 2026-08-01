# @pendex/home

The whole Pendex website — Vite + React + Tailwind CSS v4 + DaisyUI —
one package, one build, one GitHub Pages deploy. Two pages live inside
it:

- **`/`** — the marketing home page (`index.html` → `src/main.tsx` → `src/App.tsx`)
- **`/docs/`** — the user guide + generated API reference (`docs/index.html` → `docs/main.tsx` → `src/docs/DocsApp.tsx`)

Both pages share the same `pendex` daisyUI theme (`src/index.css`), so
the site reads as one brand end to end. This package absorbed the
former `@pendex/api-docs` package; there's no longer a second workspace
package or a second Vite config to keep in sync.

## Local development

```sh
bun install     # from the repo root, once
bun run dev     # from repo root — delegates to this package
# or, from this directory:
bun run dev
```

The dev server serves both pages: `http://localhost:5173/` for home,
`http://localhost:5173/docs/` for the guide. The API reference under
`/docs/api` is generated separately by TypeDoc and only exists once
you've built the docs at least once — `public/docs/api` isn't
committed beyond a `.gitkeep`.

## Building

```sh
bun run build   # from repo root — delegates to this package
```

This runs, in order:

1. **`typedoc --options ../../typedoc.json`** — generates the static
   API reference from every `@pendex/*` package's JSDoc comments into
   `public/docs/api`, which Vite then copies into the build output
   automatically (it lives under `publicDir`).
2. **`tsc -b`** — project-references type check.
3. **`vite build`** — builds both HTML entry points (`index.html` and
   `docs/index.html`) into `dist/`, with `dist/docs/` holding the guide
   page and `dist/docs/api/` holding the generated reference.

The result in `dist/` is the entire site, ready to upload as a single
GitHub Pages artifact — see `.github/workflows/deploy.yml`.
