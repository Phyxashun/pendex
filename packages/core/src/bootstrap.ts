/**
 * @module bootstrap
 * @file FILE-PATH: src/components/bootstrap.ts
 *
 * Single responsibility: resolve a ready-to-use `{ config, theme,
 * categoryColors }` triple, exactly once, for whichever composition root
 * needs it — the pendex CLI shell's `Application.init()`, or the
 * `import.meta.main` block in `@pendex/compile`'s `Compile.ts` /
 * `@pendex/split`'s `Split.ts` for standalone runs. Lives in
 * `@pendex/core` (not the shell package) specifically so compile/split
 * can resolve their own deps without depending on the shell — this is
 * the only file that knows Config and Theme are connected
 * (`config.theme` names the TOML file `ThemeManager` loads) and the
 * only place that translates a theme's `[brand]` table into per-Category
 * colors views can use directly.
 */

import { ThemeManager } from '@pendex/theme';
import { ConfigManager } from './Config';
import type { Category, Config, Theme } from './types';

/**
 * The eight recognized job categories, used to filter a theme's
`[brand]` table.
 */
const CATEGORIES = [
    'source',
    'web',
    'style',
    'terminal',
    'configuration',
    'documentation',
    'testing',
    'misc',
] as const satisfies readonly Category[];

/**
 * A free-form map of theme color definitions.
 *
 * This represents a raw, unvalidated string dictionary from a parsed
theme file,
 * where keys represent UI components or categories (e.g.,
'bookCover', 'manifest',
 * 'source', 'terminal') and values are their corresponding HEX color strings.
 */
export type BrandColors = Record<string, string>;

/**
 * Filtered theme color definitions mapped strictly to recognized Job
Categories.
 *
 * An object where keys are a subset of the eight literal {@link
Category} values
 * and values are the HEX color strings extracted from the theme's raw
brand table.
 * If a category is missing from this object, it means the theme did not provide
 * a specific color override for it.
 */
export type CategoryColors = Partial<Record<Category, string>>;

/**
 * The result of {@link resolveRunnerDeps}: everything a composition root
 * needs to construct views and commands.
 */
export interface ResolvedDeps {
    // The active application config
    config: Config;
    // The active chainable theme
    theme: Theme;
    // Per-category colors extracted from the theme's `[brand]` table, if any
    categoryColors?: CategoryColors;
}

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
 *
 * @param brand - The raw `[brand]` table from a parsed theme, if any.
 * @returns Per-category brand colors, or `undefined` if none apply.
 */
const extractCategoryColors = (brand: BrandColors | undefined):
CategoryColors | undefined => {
    if (!brand) return undefined;

    const colors: CategoryColors = {};
    let hasKeys = false;

    for (const category of CATEGORIES) {
        const hex = brand[category];
        if (hex !== undefined) {
            colors[category] = hex;
            hasKeys = true;
        }
    }

    return hasKeys ? colors : undefined;
};

/**
 * Resolves the current Config, its named Theme, and any per-Category
 * brand colors, in one call.
 *
 * @returns A {@link ResolvedDeps} triple ready to hand to a view or command.
 */
export const resolveRunnerDeps = async (): Promise<ResolvedDeps> => {
    const configManager: ConfigManager = await ConfigManager.getInstance();
    const config: Config = configManager.get();

    const themeManager: ThemeManager = await
ThemeManager.getInstance(config.theme);
    const theme: Theme = themeManager.get();

    const brandColors: BrandColors = themeManager.extended().brand;
    const categoryColors: CategoryColors = extractCategoryColors(brandColors);

    return { config, theme, categoryColors };
};
