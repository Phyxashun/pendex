// FILE-PATH: packages/theme/src/ThemePalette.ts
//
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
 * The required root color slots every theme file provides.
 *
 * Keeping this list as a single constant prevents drift between:
 * - the ThemeColors type,
 * - TOML parsing/validation,
 * - and the buildTheme() implementation.
 */
export const THEME_COLOR_KEYS = [
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
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

/**
 * The hex slots every theme file provides. Structural styles (bold,
 * italic, ...) are behavior, not palette, and stay in code rather than
 * in this interface.
 */
export type ThemeColors = Readonly<Record<ThemeColorKey, string>>;

/**
 * The fully-resolved, ready-to-use theme: every slot is a function that
 * takes plain text and returns ANSI-styled text. This is what
 * `useTheme()` consumes to build its chainable proxy API.
 */
export interface DefaultTheme {
    /** @category Semantic Utilities */
    primary(text: string): string;
    /** @category Semantic Utilities */
    secondary(text: string): string;
    /** @category Semantic Utilities */
    success(text: string): string;
    /** @category Semantic Utilities */
    warning(text: string): string;
    /** @category Semantic Utilities */
    error(text: string): string;
    /** @category Semantic Utilities */
    info(text: string): string;
    /** @category Semantic Utilities */
    muted(text: string): string;

    /** @category Typography */
    title(text: string): string;
    /** @category Typography */
    subtitle(text: string): string;

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
 * The key form of {@link DefaultTheme}, used anywhere a single theme slot
 * name needs to be carried around (e.g. `useTheme`'s pending style stack).
 */
export type DefaultThemeKey = keyof DefaultTheme;

/**
 * Pendex brand palette (mirrors src/themes/pendex.toml's root colors).
 * Every value here clears WCAG-AA (4.5:1) against both #1A1A1A and
 * #262626, except `muted` (3:1 — intentionally de-emphasized text).
 */
export const BRAND_PALETTE: ThemeColors = {
    primary: '#D6A448', // Brass
    secondary: '#6F92B0', // Blueprint
    success: '#799470', // Olive
    warning: '#D99C5A', // Copper
    error: '#C57967', // Brick
    info: '#6AAFB5', // Teal
    muted: '#7B746B', // Ash
    foreground: '#E9E0D2', // Parchment
    background: '#1A1A1A', // Charcoal
    titleBg: '#262626', // Graphite
};

/**
 * Builds a working {@link DefaultTheme} from a hex map. This is the
 * ONLY place that decides how palette slots combine with structural
 * styles.
 *
 * @param colors - The ten resolved hex color slots for the theme.
 * @returns A fully-usable {@link DefaultTheme} with every slot styled
 *  via `Colors`.
 */
export function buildTheme(colors: ThemeColors): DefaultTheme {
    const semantic = {
        primary: Colors.hex(colors.primary),
        secondary: Colors.hex(colors.secondary),
        success: Colors.hex(colors.success),
        warning: Colors.hex(colors.warning),
        error: Colors.hex(colors.error),
        info: Colors.hex(colors.info),
        muted: Colors.hex(colors.muted),
    };

    return {
        ...semantic,

        title: txt =>
            Colors.bgHex(colors.primary)(
                Colors.bold(Colors.hex(colors.titleBg)(` ${txt} `)),
            ),
        subtitle: txt => Colors.dim(Colors.hex(colors.foreground)(txt)),

        color: Colors.hex(colors.foreground),
        backgroundColor: txt => Colors.bgHex(colors.background)(` ${txt} `),
        bold: Colors.bold,
        italic: Colors.italic,
        textDecoration: Colors.underline,
        textTransform: txt => txt.toUpperCase(),
    };
}

/**
 * Synchronous fallback theme (brand palette) for contexts that can't
 * await ThemeManager.
 */
export const FALLBACK_THEME: DefaultTheme = buildTheme(BRAND_PALETTE);

/**
 * @PendexTheme — the full pendex.toml schema
 *
 * A theme file is more than the ten ThemeColors slots buildTheme() needs:
 * it can also carry a named swatch palette, ANSI 16-color mappings,
 * syntax-highlighting colors, git/diagnostic/diff colors, website colors,
 * and Pendex's own brand-concept colors (compile/split/manifest/...).
 * None of those extra tables are consumed by buildTheme() today — they're
 * captured and exposed via ThemeManager.extended() for future use (e.g.
 * coloring a job's title by its Category using [brand]) without forcing
 * every theme author to define slots nothing reads yet.
 *
 * *FORMAT NOTE:
 * color scalars (primary, secondary, ..., titleBg) sit at the ROOT of a
 * theme TOML file, not nested under a [colors] table — only the extended
 * groups below get their own [section]. That's what pendex.toml (and
 * default/dracula/tokyonight/onedark/monokaipro files) actually look like;
 * extractColors() reads accordingly.
 */

/**
 * The full schema a `src/themes/*.toml` file may satisfy: the ten
 * required {@link ThemeColors} slots plus optional metadata and
 * extended color tables. Extended tables aren't consumed by
 * {@link buildTheme} — they're captured for future use (e.g. via
 * `ThemeManager.extended()`) without forcing every theme author to
 * define slots nothing reads yet.
 */
export interface PendexTheme {
    name: string;
    author?: string;
    version?: string;
    description?: string;
    colors: ThemeColors;
    palette?: Record<string, string>;
    ansi?: Record<string, string>;
    syntax?: Record<string, string>;
    git?: Record<string, string>;
    diagnostics?: Record<string, string>;
    website?: Record<string, string>;
    terminal?: Record<string, string>;
    diff?: Record<string, string>;
    brand?: Record<string, string>;
}

type ExtendedTableKey =
    | 'palette'
    | 'ansi'
    | 'syntax'
    | 'git'
    | 'diagnostics'
    | 'website'
    | 'terminal'
    | 'diff'
    | 'brand';

const EXTENDED_TABLE_KEYS: ExtendedTableKey[] = [
    'palette',
    'ansi',
    'syntax',
    'git',
    'diagnostics',
    'website',
    'terminal',
    'diff',
    'brand',
];

type UnknownRecord = Record<string, unknown>;

interface MutableTheme extends PendexTheme {
    palette?: Record<string, string>;
    ansi?: Record<string, string>;
    syntax?: Record<string, string>;
    git?: Record<string, string>;
    diagnostics?: Record<string, string>;
    website?: Record<string, string>;
    terminal?: Record<string, string>;
    diff?: Record<string, string>;
    brand?: Record<string, string>;
}

/**
 * Returns true only for plain object-ish records we can safely index.
 */
function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null;
}

/**
 * Returns true only for strings that look like #RRGGBB hex colors.
 */
function isHexColor(value: unknown): value is string {
    return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

/**
 * Normalizes a hex color scalar to a stable uppercase #RRGGBB form.
 */
function normalizeHex(value: string): string {
    return value.trim().toUpperCase();
}

/**
 * Extracts the required root ThemeColors from a parsed TOML object,
 * falling back slot-by-slot to {@link BRAND_PALETTE}.
 */
function extractColors(obj: UnknownRecord): ThemeColors {
    const entries = THEME_COLOR_KEYS.map(key => {
        const raw = obj[key];
        const value = isHexColor(raw) ? normalizeHex(raw) : BRAND_PALETTE[key];
        return [key, value] as const;
    });

    return Object.fromEntries(entries) as ThemeColors;
}

/**
 * Extracts an optional extended table, preserving only string:string
 * entries. Non-object or empty tables are treated as absent.
 */
function extractTable(
    obj: UnknownRecord,
    key: ExtendedTableKey,
): Record<string, string> | undefined {
    const raw = obj[key];
    if (!isRecord(raw)) return undefined;

    const entries = Object.entries(raw).filter(([, value]) => {
        return typeof value === 'string';
    });

    if (entries.length === 0) return undefined;

    return Object.fromEntries(entries) as Record<string, string>;
}

/**
 * Validates/normalizes a parsed theme TOML object into a full
 * {@link PendexTheme}, degrading safely to the brand palette anywhere
 * fields are missing or malformed.
 *
 * @param raw - Parsed TOML object, if any.
 * @param fallbackName - Theme file stem requested by the caller; used
 *  when the theme metadata itself does not provide a name.
 * @returns A fully-formed {@link PendexTheme}.
 */
export function parsePendexTheme(
    raw: unknown,
    fallbackName: ThemeName = 'pendex',
): PendexTheme {
    const obj: UnknownRecord = isRecord(raw) ? raw : {};

    // Initialize and cast as a Partial version of the mutable type
    const theme = {
        name: typeof obj.name === 'string' ? obj.name : fallbackName,
        author: typeof obj.author === 'string' ? obj.author : undefined,
        version: typeof obj.version === 'string' ? obj.version : undefined,
        description:
            typeof obj.description === 'string' ? obj.description : undefined,
        colors: extractColors(obj),
    } as Partial<MutableTheme> as MutableTheme; // Double assertion tells TS it will be filled

    // The loop safely populates the remaining keys
    for (const key of EXTENDED_TABLE_KEYS) {
        theme[key] = extractTable(obj, key);
    }

    return theme;
}
