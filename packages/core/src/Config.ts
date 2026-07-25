
import type { Config, Job } from './types';
import { Constants } from './Constants';

const BASE_CONFIG_PATH = `${import.meta.dir}/../config/config.toml`;   // packages/core/config/

const CONFIG_KEYS = [
    'theme',
    'outputDir',
    'rebuiltDir',
    'exclude',
    'jobs',
] as const;

export function assignKey<T, K extends keyof T>(target: T, source: Partial<T>, key: K) {
    const value = source[key];
    if (value !== undefined) {
        target[key] = value;
    }
}

/**
 * Singleton owner of the app's runtime Config.
 *
 * Defaults are parsed once from `config/config.toml` via `Bun.TOML.parse`.
 * If a `runtime.config.json` override exists on disk, it's merged on top
 * the first time the config is loaded. There's exactly one instance per
 * process, obtained via `ConfigManager.getInstance()`.
 *
 * `theme` is a ThemeName — the stem of a file in src/themes/ (e.g.
 * "default", "dracula") — resolved by ThemeManager, not a dark/light
 * binary. Unknown names degrade to the brand palette there, so no
 * validation is needed here.
 */
export class ConfigManager {
    private static instance: ConfigManager | null = null;

    private config: Config;

    private constructor(config: Config) {
        this.config = config;
    }

    /** Reads and parses the shipped config.toml into a base Config. */
    private static async readTomlDefaults(): Promise<Config> {
        const tomlText = await Bun.file(BASE_CONFIG_PATH).text();
        const parsed = Bun.TOML.parse(tomlText) as unknown as Config;

        // Preserve job-specific excludes without flattening them globally
        const jobs = parsed.jobs.map((job) => ({
            ...job,
            exclude: job.exclude ?? [],
        })) as Job[];

        return {
            theme: parsed.theme || 'pendex',
            outputDir: parsed.outputDir,
            rebuiltDir: parsed.rebuiltDir,
            exclude: [...parsed.exclude, Constants.RUNTIME_CONFIG_PATH],
            jobs,
        };
    }

    /** Merges a runtime.config.json override (if present) on top of a base Config. */
    private static async withDiskOverrides(base: Config): Promise<Config> {
        const overrideFile = Bun.file(Constants.RUNTIME_CONFIG_PATH);
        if (!(await overrideFile.exists())) return base;

        try {
            const merged: Config = { ...base };
            const parsed = (await overrideFile.json()) as Config;
            CONFIG_KEYS.forEach((key) => assignKey(merged, parsed, key));
            return merged;
        } catch {
            return base;
        }
    }

    /** Lazily creates (once per process) and returns the shared instance. */
    public static async getInstance(): Promise<ConfigManager> {
        if (!this.instance) {
            const defaults = await this.readTomlDefaults();
            const config = await this.withDiskOverrides(defaults);
            this.instance = new ConfigManager(config);
        }
        return this.instance;
    }

    /** Resets the singleton. Primarily useful for test isolation. */
    public static resetInstance(): void {
        this.instance = null;
    }

    /** Current in-memory config. */
    public get(): Config {
        return this.config;
    }

    /** Re-reads config.toml + runtime.config.json and replaces the cached config. */
    public async reload(): Promise<Config> {
        const defaults = await ConfigManager.readTomlDefaults();
        this.config = await ConfigManager.withDiskOverrides(defaults);
        return this.config;
    }

    /** Discards runtime overrides in memory (does not touch disk until save() is called). */
    public async resetToDefaults(): Promise<Config> {
        this.config = await ConfigManager.readTomlDefaults();
        return this.config;
    }

    /** Persists the current in-memory config to runtime.config.json. */
    public async save(): Promise<void> {
        await Bun.write(Constants.RUNTIME_CONFIG_PATH, JSON.stringify(this.config, null, 2));
    }
}
