// FILE-PATH: packages/theme/src/index.ts

/**
 * @module @pendex/theme
 *
 * Public entry point for the `@pendex/theme` package: the singleton
 * {@link ThemeManager}, the palette/schema types from `ThemePalette`,
 * the {@link useTheme} chaining engine, and the synchronous
 * {@link FallbackTheme} for contexts that can't await a file read.
 */

import { FALLBACK_THEME } from './ThemePalette';
import { useTheme } from './useTheme';

export { ThemeManager } from './ThemeManager';

export {
    BRAND_PALETTE,
    buildTheme,
    FALLBACK_THEME,
    parsePendexTheme,
    THEME_COLOR_KEYS,
    type DefaultTheme,
    type DefaultThemeKey,
    type PendexTheme,
    type ThemeColorKey,
    type ThemeColors,
    type ThemeName,
} from './ThemePalette';

export { useTheme, type ChainableTheme, type Theme } from './useTheme';

/**
 * Synchronous brand-palette theme.
 *
 * This is the chainable proxy form of {@link FALLBACK_THEME}; exporting
 * both lets callers choose either the flat style-function object or the
 * chainable `theme.bold.primary('txt')` API.
 */
export const FallbackTheme = useTheme(FALLBACK_THEME);
