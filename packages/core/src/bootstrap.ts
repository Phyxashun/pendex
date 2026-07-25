// FILE-PATH: src/components/bootstrap.ts
//
// SINGLE RESPONSIBILITY: resolve a ready-to-use { config, theme,
// categoryColors } triple, exactly once, for whichever composition root
// needs it — the pendex CLI shell's Application.init(), or the
// `import.meta.main` block in @pendex/compile's Compile.ts /
// @pendex/split's Split.ts for standalone runs. Lives in @pendex/core
// (not the shell package) specifically so compile/split can resolve
// their own deps without depending on the shell — this is the only
// file that knows Config and Theme are connected (config.theme names
// the TOML file ThemeManager loads) and the only place that translates
// a theme's [brand] table into per-Category colors views can use
// directly.

import type { Category, Config, Theme } from './types';
import { ConfigManager } from './Config';
import { ThemeManager } from '@pendex/theme';

export interface ResolvedDeps {
    config: Config;
    theme: Theme;
    categoryColors?: Partial<Record<Category, string>>;
}

const CATEGORIES: readonly Category[] = [
    'source', 'web', 'style', 'terminal',
    'configuration', 'documentation', 'testing', 'misc',
];

/**
 * Picks out the Category-named entries from a theme's [brand] table.
 * A theme's [brand] table is a free-form string map (it can carry
 * anything — bookCover, manifest, scanner, ...); this only keeps the
 * entries whose key is literally one of the eight Category values, so
 * a theme opts into category coloring just by naming its brand colors
 * to match (e.g. `configuration = "#..."`, not an abbreviation of it).
 * Returns undefined (not an empty object) when the theme defines no
 * [brand] table, or none of its keys match a Category, so callers can
 * tell "no coloring available" apart from "coloring available but empty".
 */
function extractCategoryColors(brand: Record<string, string> | undefined): Partial<Record<Category, string>> | undefined {
    if (!brand) return undefined;

    const colors: Partial<Record<Category, string>> = {};
    for (const category of CATEGORIES) {
        const hex = brand[category];
        if (hex) colors[category] = hex;
    }

    return Object.keys(colors).length > 0 ? colors : undefined;
}

/** Resolves the current Config, its named Theme, and any per-Category brand colors, in one call. */
export async function resolveRunnerDeps(): Promise<ResolvedDeps> {
    const config = (await ConfigManager.getInstance()).get();
    const themeManager = await ThemeManager.getInstance(config.theme);

    return {
        config,
        theme: themeManager.get(),
        categoryColors: extractCategoryColors(themeManager.extended().brand),
    };
}
