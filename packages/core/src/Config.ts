/**
 * @module Config
 *
 * Single responsibility: own the process's runtime {@link Config} —
 * loading the shipped `config/config.toml` defaults, merging any
 * `runtime.config.json` override on top, and exposing both a getter
 * and mutation helpers (`reload`, `resetToDefaults`, `save`) through
 * the {@link ConfigManager} singleton.
 */

import type { Config, Job } from './types';
import { Constants } from './Constants';

/** Absolute path to the shipped default config TOML (`packages/core/config/`). */
const BASE_CONFIG_PATH = `${import.meta.dir}/../config/config.toml`;   // packages/core/config/

/** The Config keys that a runtime.config.json override may selectively supply. */
const CONFIG_KEYS = [
    'theme',
    'outputDir',
    'rebuiltDir',
    'exclude',
    'jobs',
] as const;

/**
 * Copies `source[key]` onto `target[key]` only if it's defined —
 * used to apply a partial override without clobbering base values with
 * `undefined`.
 *
 * @param target - Object to assign into (mutated in place).
 * @param source - Partial object that may or may not define `key`.
 * @param key - The key to conditionally copy.
 */
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

    /**
     * Reads and parses the shipped config.toml into a base Config.
     *
     * @returns The base {@link Config}, with job-level excludes preserved and the runtime-config path always excluded.
     */
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

    /**
     * Merges a runtime.config.json override (if present) on top of a base Config.
     *
     * @param base - The base config to merge overrides onto.
     * @returns `base` with any valid on-disk overrides applied; `base` unchanged if the file is missing or invalid.
     */
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

    /**
     * Lazily creates (once per process) and returns the shared instance.
     *
     * @returns The shared {@link ConfigManager} instance.
     */
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

    /**
     * Current in-memory config.
     *
     * @returns The active {@link Config}.
     */
    public get(): Config {
        return this.config;
    }

    /**
     * Re-reads config.toml + runtime.config.json and replaces the cached config.
     *
     * @returns The freshly-loaded {@link Config}.
     */
    public async reload(): Promise<Config> {
        const defaults = await ConfigManager.readTomlDefaults();
        this.config = await ConfigManager.withDiskOverrides(defaults);
        return this.config;
    }

    /**
     * Discards runtime overrides in memory (does not touch disk until save() is called).
     *
     * @returns The reset, defaults-only {@link Config}.
     */
    public async resetToDefaults(): Promise<Config> {
        this.config = await ConfigManager.readTomlDefaults();
        return this.config;
    }

    /** Persists the current in-memory config to runtime.config.json. */
    public async save(): Promise<void> {
        await Bun.write(Constants.RUNTIME_CONFIG_PATH, JSON.stringify(this.config, null, 2));
    }
}
