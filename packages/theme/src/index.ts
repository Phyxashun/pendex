// FILE-PATH: packages/theme/src/index.ts

/**
 * @module @pendex/theme
 *
 * Public entry point for the `@pendex/theme` package: the singleton
 * {@link ThemeManager}, the palette/schema types from `ThemePalette`,
 * the {@link useTheme} chaining engine, and the synchronous
 * {@link FallbackTheme} for contexts that can't await a file read.
 */

import {
    BRAND_PALETTE,
    buildTheme
} from './ThemePalette';

import {
    useTheme
} from './useTheme';

export {
    ThemeManager
} from './ThemeManager';

export {
    BRAND_PALETTE,
    buildTheme,
    parsePendexTheme,
    type DefaultTheme,
    type DefaultThemeKeys,
    type PendexTheme,
    type ThemeColors,
    type ThemeName
} from './ThemePalette';

export {
    useTheme,
    type ChainableTheme,
    type Theme
} from './useTheme';

/** Synchronous brand-palette theme */
export const FallbackTheme = useTheme(buildTheme(BRAND_PALETTE));
