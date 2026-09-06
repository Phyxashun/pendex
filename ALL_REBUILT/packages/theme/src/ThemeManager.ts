// FILE-PATH: packages/theme/src/ThemeManager.ts
//
/**
 * @module ThemeManager
 *
 * Single responsibility: own the process's active Theme, exactly the way
 * `ConfigManager` owns the active Config. Loads `src/themes/<name>.toml`
 * via `Bun.TOML.parse`, hands the raw object to
 * `ThemePalette.parsePendexTheme()` for validation, builds a
 * `DefaultTheme` from its `colors` through `ThemePalette.buildTheme`,
 * wraps it in `useTheme`'s chaining engine, and hands the same `Theme`
 * instance to every caller. Unknown theme names, missing files, or
 * malformed TOML degrade to the brand palette, never crash — the theme
 * is cosmetic and must never take the app down.
 */

import type { BunFile } from 'bun';
import type { DefaultTheme, PendexTheme, ThemeName } from './ThemePalette';
import { buildTheme, parsePendexTheme } from './ThemePalette';
import type { Theme } from './useTheme';
import { useTheme } from './useTheme';

/**
 * Directory containing `<name>.toml` theme files (`packages/theme/themes/`).
 */
const THEMES_DIR = `${import.meta.dir}/../themes`;

export interface ThemeManagerState {
    themeName: ThemeName;
    defaultTheme: DefaultTheme;
    theme: Theme;
    pendexTheme: PendexTheme;
}

/**
 * Process-wide singleton that owns the active {@link Theme}. Use
 * {@link ThemeManager.getInstance} to obtain it; the constructor is
 * private.
 */
export class ThemeManager {
    private static instance: ThemeManager | null = null;
    private static instancePromise: Promise<ThemeManager> | null = null;

    private readonly theme: Theme;
    private readonly themeName: ThemeName;
    private readonly pendexTheme: PendexTheme;
    private readonly defaultTheme: DefaultTheme;

    private constructor(state: ThemeManagerState) {
        this.themeName = state.themeName;
        this.theme = state.theme;
        this.pendexTheme = state.pendexTheme;
        this.defaultTheme = state.defaultTheme;
    }

    /**
     * Builds the absolute path for a theme file stem under `THEMES_DIR`.
     */
    private static filePathFor(name: ThemeName): string {
        return `${THEMES_DIR}/${name}.toml`;
    }

    /**
     * Reads and validates `src/themes/<name>.toml` into a full PendexTheme.
     *
     * @param name - Theme name (file stem under `THEMES_DIR`).
     * @returns The validated {@link PendexTheme}, degrading to the
     *  brand palette on any failure.
     */
    private static async readPendexTheme(
        name: ThemeName,
    ): Promise<PendexTheme> {
        const filePath: string = this.filePathFor(name);
        const file: BunFile = Bun.file(filePath);

        try {
            if (!(await file.exists()))
                return parsePendexTheme(undefined, name);

            const parsed: unknown = Bun.TOML.parse(await file.text());
            return parsePendexTheme(parsed, name);
        } catch {
            return parsePendexTheme(undefined, name);
        }
    }

    /**
     * Resolves all runtime theme state from a requested theme name:
     * - the parsed/validated full PendexTheme
     * - the flat DefaultTheme
     * - the chainable Theme proxy
     *
     * Keeping this assembly in one place avoids duplicating theme-build
     * knowledge across the singleton lifecycle.
     */
    private static async loadState(
        themeName: ThemeName,
    ): Promise<ThemeManagerState> {
        const pendexTheme: PendexTheme = await this.readPendexTheme(themeName);
        const defaultTheme: DefaultTheme = buildTheme(pendexTheme.colors);
        const theme: Theme = useTheme(defaultTheme);

        return {
            themeName,
            defaultTheme,
            theme,
            pendexTheme,
        };
    }

    /**
     * Lazily creates (once per process) and returns the shared instance.
     * The first call decides the theme for the process; subsequent calls
     * return the same instance regardless of the name passed — same
     * contract as ConfigManager.
     *
     * Uses an in-flight promise guard so concurrent first calls do not
     * race and build multiple instances.
     *
     * @param themeName - Theme to load on first call (default
     *  `'pendex'`); ignored on subsequent calls.
     * @returns The shared {@link ThemeManager} instance.
     */
    public static async getInstance(
        themeName: ThemeName = 'pendex',
    ): Promise<ThemeManager> {
        if (this.instance) return this.instance;
        if (this.instancePromise) return this.instancePromise;

        this.instancePromise = (async () => {
            const state: ThemeManagerState = await this.loadState(themeName);
            const instance = new ThemeManager(state);
            this.instance = instance;
            this.instancePromise = null;
            return instance;
        })();

        return this.instancePromise;
    }

    /**
     * Resets the singleton. Primarily useful for test isolation.
     */
    public static resetInstance(): void {
        this.instance = null;
        this.instancePromise = null;
    }

    /**
     * The active chainable Theme, built from the ten ThemeColors slots.
     */
    public get(): Theme {
        return this.theme;
    }

    /**
     * The name the active theme was loaded as.
     *
     * Note: this is the requested file stem, not necessarily the theme
     * metadata's internal `name` field. If the requested file is missing
     * or malformed, the returned Theme may still be a fallback-built one.
     */
    public name(): ThemeName {
        return this.themeName;
    }

    /**
     * The full parsed theme file, including extended tables (palette,
     * ansi, syntax, git, diagnostics, website, terminal, diff, brand)
     * that buildTheme() doesn't consume. Undefined for any table not
     * present in the loaded file.
     */
    public extended(): PendexTheme {
        return this.pendexTheme;
    }

    /**
     * The active flat DefaultTheme before it is wrapped in `useTheme`.
     * Useful for tests or for call sites that want direct style
     * functions without the chainable proxy.
     */
    public raw(): DefaultTheme {
        return this.defaultTheme;
    }
}
