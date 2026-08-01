/**
 * @module clean
 * @file FILE-PATH: clean.ts
 *
 * Single responsibility: remove generated/build output across the
 * whole workspace — `bun run clean`. Bun-native (`fs.rm`), no external
 * dependency needed. Safe to re-run; missing paths are silently
 * skipped via `force: true`.
 */

const TARGETS = [
    // Root CLI build output
    'dist',
    // Pendex's own compile/split output, when run against this repo itself
    'ALL',
    'ALL_REBUILT',
    // Per-package build/coverage output
    'packages/home/dist',
    'packages/color/dist',
    'packages/theme/dist',
    'packages/core/dist',
    'packages/compile/dist',
    'packages/split/dist',
    'coverage',
    // TypeScript project-reference build info
    'packages/home/node_modules/.tmp',
];

for (const target of TARGETS) {
    await Bun.$`rm -rf ${target}`.quiet().catch(() => {});
}

// NOTE: packages/home/public/docs/api (TypeDoc's generated API reference)
// is deliberately NOT cleaned here. It's committed to the repo rather
// than treated as ephemeral build output, so `bun run clean` must not
// touch it — a prior version of this script deleted it, which showed up
// as unintended file deletions in the next commit. Regenerate it
// explicitly with `bun run --cwd packages/home docs:api` if you want a
// fresh copy before committing.

console.log(`Cleaned ${TARGETS.length} build output paths.`);
