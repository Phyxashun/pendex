// FILE-PATH: src/components/ThemeManager.ts
//
// SINGLE RESPONSIBILITY: own the process's active Theme, exactly the way
// ConfigManager owns the active Config. Loads src/themes/<name>.toml via
// Bun.TOML.parse, hands the raw object to ThemePalette.parsePendexTheme()
// for validation, builds a DefaultTheme from its `colors` through
// ThemePalette.buildTheme, wraps it in useTheme's chaining engine, and
// hands the same Theme instance to every caller. Unknown theme names,
// missing files, or malformed TOML degrade to the brand palette, never
// crash — the theme is cosmetic and must never take the app down.

import { buildTheme, parsePendexTheme, type PendexTheme, type ThemeName } from './ThemePalette';
import { useTheme, type Theme } from './useTheme';

const THEMES_DIR = `${import.meta.dir}/../themes`;   // packages/theme/themes/

export class ThemeManager {
    private static instance: ThemeManager | null = null;

    private readonly theme: Theme;
    private readonly themeName: ThemeName;
    private readonly pendexTheme: PendexTheme;

    private constructor(themeName: ThemeName, theme: Theme, pendexTheme: PendexTheme) {
        this.themeName = themeName;
        this.theme = theme;
        this.pendexTheme = pendexTheme;
    }

    /** Reads and validates src/themes/<name>.toml into a full PendexTheme. */
    private static async readPendexTheme(name: ThemeName): Promise<PendexTheme> {
        const file = Bun.file(`${THEMES_DIR}/${name}.toml`);
        if (!(await file.exists())) return parsePendexTheme(undefined, name);

        try {
            const parsed = Bun.TOML.parse(await file.text());
            return parsePendexTheme(parsed, name);
        } catch {
            return parsePendexTheme(undefined, name);
        }
    }

    /**
     * Lazily creates (once per process) and returns the shared instance.
     * The first call decides the theme for the process; subsequent calls
     * return the same instance regardless of the name passed — same
     * contract as ConfigManager.
     */
    public static async getInstance(themeName: ThemeName = 'pendex'): Promise<ThemeManager> {
        if (!this.instance) {
            const pendexTheme = await this.readPendexTheme(themeName);
            const theme = useTheme(buildTheme(pendexTheme.colors));
            this.instance = new ThemeManager(themeName, theme, pendexTheme);
        }
        return this.instance;
    }

    /** Resets the singleton. Primarily useful for test isolation. */
    public static resetInstance(): void {
        this.instance = null;
    }

    /** The active chainable Theme, built from the ten ThemeColors slots. */
    public get(): Theme {
        return this.theme;
    }

    /** The name the active theme was loaded as. */
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
}
