/**
 * @module ThemePalette
 *
 * Single responsibility: what a theme *means* — the {@link DefaultTheme}
 * contract, the hex-map schema that TOML theme files must satisfy, and
 * the builder ({@link buildTheme}) that turns a hex map into a working
 * `DefaultTheme` via `Colors`. No picocolors, no file I/O (`ThemeManager`
 * owns loading), no chaining (`useTheme` owns that).
 *
 * {@link BRAND_PALETTE} below is the in-code copy of `src/themes/pendex.toml`
 * — pendex.toml is the canonical theme every other theme file's layout
 * mirrors, and its colors are the ones verified (WCAG-AA 4.5:1 for
 * text, 3:1 for the intentionally de-emphasized `muted`) against both
 * of Pendex's standard terminal backgrounds, #1A1A1A and #262626. This
 * constant exists so the app always has a synchronous fallback theme
 * (commands' `deps.theme ?? FallbackTheme` can't await a file read) and
 * so a missing/corrupt themes directory degrades gracefully instead of
 * crashing — the old light cream/brown palette (the original asset-pack
 * "Default" theme, background #F6F1E8) has been retired: every Pendex
 * surface, including the synchronous fallback, is now dark-terminal
 * first.
 */

import { Colors } from '@pendex/color';

/**
 * A theme is chosen by name — the stem of a file in src/themes/.
 */
export type ThemeName = string;

/**
 * The hex slots every theme file provides. Structural styles (bold,
 * italic, ...) are behavior, not palette, and stay in code rather than
 * in this interface.
 */
export interface ThemeColors {
    readonly primary: string;
    readonly secondary: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly info: string;
    readonly muted: string;
    readonly foreground: string;
    readonly background: string;
    readonly titleBg: string;
}

type ThemeColorsKeys = readonly keyof ThemeColors;

/**
 * The fully-resolved, ready-to-use theme: every slot is a function that
 * takes plain text and returns ANSI-styled text. This is what
 * {@link buildTheme} produces and what the rest of the app (via
 * `useTheme`) actually calls.
 */
export interface DefaultTheme {
    // CSS Semantic Utilities
    /** @category CSS Semantic Utilities */
    primary(text: string): string;
    /** @category CSS Semantic Utilities */
    secondary(text: string): string;
    /** @category CSS Semantic Utilities */
    success(text: string): string;
    /** @category CSS Semantic Utilities */
    warning(text: string): string;
    /** @category CSS Semantic Utilities */
    error(text: string): string;
    /** @category CSS Semantic Utilities */
    info(text: string): string;
    /** @category CSS Semantic Utilities */
    muted(text: string): string;

    // Typography Styles
    /** @category Typography Styles */
    title(text: string): string;
    /** @category Typography Styles */
    subtitle(text: string): string;

    // CSS Styles
    /** @category CSS Styles */
    color(text: string): string;
    /** @category CSS Styles */
    backgroundColor(text: string): string;
    /** @category CSS Styles */
    bold(text: string): string;
    /** @category CSS Styles */
    italic(text: string): string;
    /** @category CSS Styles */
    textDecoration(text: string): string;
    /** @category CSS Styles */
    textTransform(text: string): string;
}

/**
 * The list-of-keys form of {@link DefaultTheme}, used to iterate every slot.
 */
export type DefaultThemeKeys = Array<readonly keyof DefaultTheme>;

/**
 * Pendex brand palette (mirrors src/themes/pendex.toml's root colors).
 * Every value here clears WCAG-AA (4.5:1) against both #1A1A1A and
 * #262626, except `muted` (3:1 — intentionally de-emphasized text).
 */
export const BRAND_PALETTE: ThemeColors = {
    primary: '#D6A448',      // Brass
    secondary: '#6F92B0',    // Blueprint
    success: '#799470',      // Olive
    warning: '#D99C5A',      // Copper
    error: '#C57967',        // Brick
    info: '#6AAFB5',         // Teal
    muted: '#7B746B',        // Ash
    foreground: '#E9E0D2',   // Parchment
    background: '#1A1A1A',   // Charcoal
    titleBg: '#262626',      // Graphite
};

/**
 * Builds a working {@link DefaultTheme} from a hex map. This is the
 * ONLY place that decides how palette slots combine with structural
 * styles.
 *
 * @param colors - The ten resolved hex color slots for the theme.
 * @returns A fully-usable {@link DefaultTheme} with every slot styled
via `Colors`.
 */
export function buildTheme(colors: ThemeColors): DefaultTheme {
    return {
        primary: Colors.hex(colors.primary),
        secondary: Colors.hex(colors.secondary),
        success: Colors.hex(colors.success),
        warning: Colors.hex(colors.warning),
        error: Colors.hex(colors.error),
        info: Colors.hex(colors.info),
        muted: Colors.hex(colors.muted),

        title: (txt) =>
Colors.bgHex(colors.primary)(Colors.bold(Colors.hex(colors.titleBg)(`
${txt} `))),
        subtitle: (txt) => Colors.dim(Colors.hex(colors.foreground)(txt)),

        color: Colors.hex(colors.foreground),
        backgroundColor: (txt) => Colors.bgHex(colors.background)(` ${txt} `),
        bold: Colors.bold,
        italic: Colors.italic,
        textDecoration: Colors.underline,
        textTransform: (txt) => txt.toUpperCase(),
    };
}

/**
 * Synchronous fallback theme (brand palette) for contexts that can't
await ThemeManager.
 */
export const FALLBACK_THEME: DefaultTheme = buildTheme(BRAND_PALETTE);

///////////////////////////////////////////////////////////////////////////
// PendexTheme — the full pendex.toml schema
///////////////////////////////////////////////////////////////////////////
//
// A theme file is more than the ten ThemeColors slots buildTheme() needs:
// it can also carry a named swatch palette, ANSI 16-color mappings,
// syntax-highlighting colors, git/diagnostic/diff colors, website colors,
// and Pendex's own brand-concept colors (compile/split/manifest/...).
// None of those extra tables are consumed by buildTheme() today — they're
// captured and exposed via ThemeManager.extended() for future use (e.g.
// coloring a job's title by its Category using [brand]) without forcing
// every theme author to define slots nothing reads yet.
//
// FORMAT NOTE: color scalars (primary, secondary, ..., titleBg) sit at
// the ROOT of a theme TOML file, not nested under a [colors] table —
// only the extended groups below get their own [section]. That's what
// pendex.toml (and the migrated default/dracula/tokyonight/onedark/
// monokaipro files) actually look like; extractColors() reads accordingly.

/**
 * The full schema a `src/themes/*.toml` file may satisfy: the ten
 * required {@link ThemeColors} slots plus optional metadata and
 * extended color tables. Extended tables aren't consumed by
 * {@link buildTheme} — they're captured for future use (e.g. via
 * `ThemeManager.extended()`) without forcing every theme author to
 * define slots nothing reads yet.
 */
export interface PendexTheme {
    /** Display name of the theme. */
    readonly name: string;
    /** Optional author attribution. */
    readonly author?: string;
    /** Optional theme version string. */
    readonly version?: string;
    /** Optional human-readable description. */
    readonly description?: string;
    /** The ten required color slots (see {@link ThemeColors}). */
    readonly colors: ThemeColors;
    /** Optional named swatch palette. */
    readonly palette?: Record<string, string>;
    /** Optional website-specific colors. */
    readonly website?: Record<string, string>;
    /** Optional terminal color overrides. */
    readonly terminal?: Record<string, string>;
    /** Optional ANSI 16-color mapping. */
    readonly ansi?: Record<string, string>;
    /** Optional syntax-highlighting colors. */
    readonly syntax?: Record<string, string>;
    /** Optional git status colors. */
    readonly git?: Record<string, string>;
    /** Optional diagnostic (error/warning/info) colors. */
    readonly diagnostics?: Record<string, string>;
    /** Optional diff (added/removed/changed) colors. */
    readonly diff?: Record<string, string>;
    /** Optional Pendex brand-concept colors (compile/split/manifest/...). */
    readonly brand?: Record<string, string>;
}

type PendexThemeKeys = readonly keyof PendexTheme;

/**
 * The ten {@link ThemeColors} keys, used to walk a raw TOML object's root.
 */
const THEME_COLOR_KEYS = [
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
    'muted',
    'foreground',
    'background',
    'titleBg',
] as const satisfies Array<ThemeColorsKeys>;

/**
 * The optional extended-table keys on {@link PendexTheme},
 * used to walk a raw TOML object's sections.
 */
const EXTENDED_TABLE_KEYS = [
    'palette',
    'website',
    'terminal',
    'ansi',
    'syntax',
    'git',
    'diagnostics',
    'diff',
    'brand',
] as const satisfies Array<PendexThemeKeys>;

/**
 * Reads the ten ThemeColors slots off the ROOT of a raw parsed-TOML
 * object, falling back to the brand palette per-key — a theme file that
 * only overrides `primary` still produces a fully usable ThemeColors.
 *
 * @param raw - Raw, already-parsed TOML object for a theme file.
 * @returns A complete {@link ThemeColors}, backfilled from {@link
BRAND_PALETTE}.
 */
function extractColors(raw: Record<string, unknown>): ThemeColors {
    const colors: Record<ThemeColorsKeys, string> = { ...BRAND_PALETTE };
    for (const key of THEME_COLOR_KEYS) {
        const value = raw[key];
        if (typeof value === 'string') colors[key] = value;
    }
    return colors;
}

/**
 * Extracts one named `[section]` as a flat string map, dropping any
 * non-string entries.
 *
 * @param raw - Raw, already-parsed TOML object for a theme file.
 * @param key - The section name to extract (e.g. `'syntax'`).
 * @returns A flat string map, or `undefined` if the section is
missing, not an object, or an array.
 */
function extractTable(raw: Record<string, unknown>, key: string):
Record<string, string> | undefined {
    const value = raw[key];
    // typeof [] === 'object' in JS, so Array.isArray must be checked
    // explicitly — otherwise a TOML array under a table-shaped key (e.g.
    // `syntax = ["array"]`) would pass this guard and get turned into a
    // bogus { '0': 'array' } table via Object.entries() below, instead
    // of correctly degrading to undefined like any other malformed table.
    if (!value || typeof value !== 'object' || Array.isArray(value))
return undefined;

    const table: Record<string, string> = {};
    for (const [entryKey, entryValue] of Object.entries(value as
Record<string, unknown>)) {
        if (typeof entryValue === 'string') table[entryKey] = entryValue;
    }
    return table;
}

/**
 * Parses a raw (already TOML-parsed) object into a validated PendexTheme.
 * Never throws: a missing/malformed/non-object input produces a theme
 * that's entirely brand-palette colors with no extended tables, the same
 * degrade-never-crash guarantee the rest of the theme system makes.
 *
 * @param raw - The result of parsing a theme TOML file (or anything
else — untrusted input is safe to pass here).
 * @param fallbackName - Name to use if `raw` doesn't provide a valid
`name` field.
 * @returns A validated {@link PendexTheme}.
 */
export function parsePendexTheme(raw: unknown, fallbackName: string):
PendexTheme {
    const obj = (raw && typeof raw === 'object' ? raw : {}) as
Record<string, unknown>;

    const theme: { -readonly [K in PendexThemeKeys]: PendexTheme[K] } = {
        name: typeof obj.name === 'string' ? obj.name : fallbackName,
        author: typeof obj.author === 'string' ? obj.author : undefined,
        version: typeof obj.version === 'string' ? obj.version : undefined,
        description: typeof obj.description === 'string' ?
obj.description : undefined,
        colors: extractColors(obj),
    };

    for (const key of EXTENDED_TABLE_KEYS) {
        theme[key] = extractTable(obj, key);
    }

    return theme;
}
