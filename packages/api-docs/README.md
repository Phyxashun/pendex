# @pendex/api-docs

The user guide and API documentation hub for Pendex — Vite + React +
Tailwind CSS v4 + DaisyUI. Deployed to GitHub Pages nested under
`/docs/`, alongside `packages/home` (which owns the site root).

## Local development

```sh
bun install               # from the repo root, once
bun run dev:api-docs      # or: bun run --cwd packages/api-docs dev
```

The dev server serves the guide pages only. The API reference (under
`/api`) is generated separately by TypeDoc and only exists once you've
run a build — `public/api` isn't committed, so a fresh
`bun run dev:api-docs` won't have an `/api` route until you build at
least once.

## Building

```sh
bun run build:api-docs    # or: bun run --cwd packages/api-docs build
```

This runs, in order:

1. **`typedoc --options ../../typedoc.json`** — generates the static API
   reference site from every `@pendex/*` package's JSDoc comments into
   `packages/api-docs/public/api`.
2. **`tsc --noEmit`** — typechecks the docs app itself.
3. **`vite build`** — builds the guide pages into `dist/`, copying
   `public/api` (the TypeDoc output) alongside them automatically since
   anything under `public/` is copied verbatim into `dist/`.

The result in `packages/api-docs/dist/` is a single static site: the
guide at its root, the full API reference at `/api`.

## Deploying to GitHub Pages

Handled by the shared `.github/workflows/deploy.yml`, which also builds
`packages/home`. It builds both apps, then combines them into one
GitHub Pages artifact — `packages/home`'s build becomes the site root,
and this package's build is copied into a `docs/` subdirectory —
because a repo can only have one live Pages deployment, so both apps
have to land in a single upload rather than two competing workflows.

`vite.config.ts` sets `base: '/pendex/docs/'` for production builds to
match that nested serving path
(`https://<user>.github.io/pendex/docs/`). If the repository is ever
renamed, this package moves to a different nested path, or `home` stops
owning the root, update `REPO_NAME`/`NESTED_PATH` in `vite.config.ts`
(and the `Combine builds` step in `deploy.yml`) to match.

One manual, one-time step this workflow can't do for you: in the
repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

