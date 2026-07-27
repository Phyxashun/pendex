/** One entry in the "Packages" section: name, one-line role, and its generated API docs path. */
export interface PackageInfo {
    name: string;
    tagline: string;
    /** Path under /api (typedoc's output) to this package's module page. */
    apiPath: string;
}

/**
 * The five `@pendex/*` workspace packages, in dependency order
 * (color → theme → core → compile/split) — the same order the
 * monorepo README describes the build graph in.
 */
export const PACKAGES: PackageInfo[] = [
    {
        name: '@pendex/color',
        tagline: 'ANSI text styling — picocolors-compatible, plus 24-bit truecolor.',
        apiPath: 'modules/color_src.html',
    },
    {
        name: '@pendex/theme',
        tagline: 'TOML-driven theme system built on @pendex/color.',
        apiPath: 'modules/theme_src.html',
    },
    {
        name: '@pendex/core',
        tagline: 'Shared domain types, config, file scanning, and the archive format.',
        apiPath: 'modules/core_src.html',
    },
    {
        name: '@pendex/compile',
        tagline: 'Consolidates a project into banner-delimited .txt archives.',
        apiPath: 'modules/compile_src.html',
    },
    {
        name: '@pendex/split',
        tagline: 'Rebuilds the original file tree from compiled archives.',
        apiPath: 'modules/split_src.html',
    },
];
