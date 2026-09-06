// FILE-PATH: packages/core/src/Config.ts
//
/**
 * @module Config
 *
 * Single responsibility: own the process's runtime {@link Config} —
 * loading the shipped `config/config.toml` defaults, merging any
 * `runtime.config.json` override on top, and exposing both a getter
 * and mutation helpers (`reload`, `resetToDefaults`, `save`) through
 * the {@link ConfigManager} singleton.
 */

import type { BunFile } from 'bun';
import { Constants, normalizePath } from './Constants';
import type {
    Category,
    Config,
    DeepPartial,
    Job,
    RawDiskConfig,
} from './types';

/**
 * BUN PROPERTIES
 */
const BASE = {
    // The name of the current file, e.g. index.ts
    CURRENT_FILE: import.meta.file,

    // A string url to the current file, e.g.
    // file:///path/to/project/index.ts. Equivalent to import.meta.url in
    // browsers.
    CURRENT_URL: new URL(import.meta.url),

    ABSOLUTE_PATH: normalizePath(Bun.fileURLToPath(new URL(import.meta.url))),

    // Absolute path to the current file, e.g.
    // /path/to/project/index.ts. Equivalent to __filename in CommonJS
    // modules (and Node.js). An alias to import.meta.filename for Node.js
    // compatibility.
    CURRENT_PATH: normalizePath(import.meta.path),

    // Absolute path to the directory containing the current file,
    // e.g. /path/to/project. Equivalent to __dirname in CommonJS modules
    // (and Node.js). An alias to import.meta.dirname for Node.js
    // compatibility.
    CURRENT_DIR: normalizePath(import.meta.dir),

    // Indicates whether the current file is the entrypoint to the
    // current bun process: true if it’s executed directly by bun run,
    // false if it’s imported.
    //ENTRY_POINT: import.meta.main,

    // Resolve a module specifier (e.g. "zod" or "./file.tsx") to a
    // url. Equivalent to import.meta.resolve in browsers. Example:
    // import.meta.resolve("zod") returns
    // "file:///path/to/project/node_modules/zod/index.ts"
    //CURRENT_MODULE_URL: import.meta.resolve('./Config.ts'),

    // An alias to process.env.
    //ENV: import.meta.env,
    CONFIG_PATH: `${normalizePath(import.meta.dir)}/../config/config.toml`,
    CONFIG_KEYS: [
        'theme',
        'http',
        'outputType',
        'outputDir',
        'rebuiltDir',
        'exclude',
        'jobs',
    ],
    THEMES_PATH: `${normalizePath(import.meta.dir)}/../../../theme`,
} as const;

// Absolute path to the shipped default config TOML (`packages/core/config/`).
const BASE_CONFIG_PATH: string = BASE.CONFIG_PATH;

/**
 * Copies `source[key]` onto `target[key]` only if it's defined —
 * used to apply a partial override without clobbering base values with
 * `undefined`.
 *
 * @param target - Object to assign into (mutated in place).
 * @param source - Partial object that may or may not define `key`.
 * @param key - The key to conditionally copy.
 */
export function assignKey<T, K extends keyof T>(
    target: T,
    source: Partial<T>,
    key: K,
): void {
    const value: Partial<T>[K] = source[key];
    if (value !== undefined) {
        target[key] = value;
    }
}

/**
 * Safe Defaults
 */
const SAFE_DEFAULTS: Config = {
    theme: {
        name: 'pendex',
        path: BASE.THEMES_PATH,
    },
    http: true,
    outputType: 'txt',
    outputDir: './ALL',
    rebuiltDir: './ALL_REBUILT',
    exclude: [],
    jobs: [],
} as const;

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
     * @returns The base {@link Config}, with job-level excludes
     *  preserved and the runtime-config path always excluded.
     */
    private static async readTomlDefaults(): Promise<Config> {
        const tomlText: string = await Bun.file(BASE_CONFIG_PATH).text();
        const parsed = Bun.TOML.parse(tomlText) as unknown as RawDiskConfig;

        // Preserve job-specific excludes without flattening them globally
        const parsedJobs: Array<DeepPartial<Job>> =
            parsed.jobs ?? SAFE_DEFAULTS.jobs;
        const jobs: Job[] = parsedJobs.map((job: DeepPartial<Job>): Job => {
            return {
                filename: job?.filename ?? '',
                category: (job?.category as Category) ?? 'misc',
                description: job?.description ?? '',
                include: job?.include ?? [],
                exclude: job?.exclude ?? [],
            };
        });

        const result: Config = {
            theme: {
                name: parsed.theme?.name ?? SAFE_DEFAULTS.theme.name,
                path: SAFE_DEFAULTS.theme.path,
            },
            http: parsed.http ?? SAFE_DEFAULTS.http,
            outputType: parsed.outputType ?? SAFE_DEFAULTS.outputType,
            outputDir: parsed.outputDir ?? SAFE_DEFAULTS.outputDir,
            rebuiltDir: parsed.rebuiltDir ?? SAFE_DEFAULTS.rebuiltDir,
            exclude: [
                ...(parsed.exclude ?? SAFE_DEFAULTS.exclude),
                Constants.RUNTIME_CONFIG_PATH,
            ],
            jobs,
        };

        return result;
    }

    /**
     * Merges a runtime.config.json override (if present) on top of a
     * base Config.
     *
     * @param base - The base config to merge overrides onto.
     * @returns `base` with any valid on-disk overrides applied;
     *  `base` unchanged if the file is missing or invalid.
     */
    private static async withDiskOverrides(base: Config): Promise<Config> {
        const overrideFile: BunFile = Bun.file(Constants.RUNTIME_CONFIG_PATH);

        if (!(await overrideFile.exists())) return base;

        try {
            const merged: Config = structuredClone(base);
            // Type safely as raw incoming data
            const parsed = (await overrideFile.json()) as RawDiskConfig;

            if (parsed.theme) {
                merged.theme.name = parsed.theme.name ?? merged.theme.name;
            }

            merged.http = parsed.http ?? merged.http;
            merged.outputType = parsed.outputType ?? merged.outputType;
            merged.outputDir = parsed.outputDir ?? merged.outputDir;
            merged.rebuiltDir = parsed.rebuiltDir ?? merged.rebuiltDir;

            if (parsed.exclude) {
                merged.exclude = Array.from(
                    // Safely falls back to an empty array if parsed.exclude is malformed
                    new Set([
                        ...(parsed.exclude ?? []),
                        Constants.RUNTIME_CONFIG_PATH,
                    ]),
                );
            }

            if (parsed.jobs) {
                // Re-mapping incoming partial jobs ensures strict Job compliance
                merged.jobs = parsed.jobs.map(
                    (job: DeepPartial<Job>, index: number): Job => {
                        const baseJob: Job | undefined = merged.jobs[index];
                        return {
                            filename: job?.filename ?? baseJob?.filename ?? '',
                            category:
                                (job?.category as Category) ??
                                baseJob?.category ??
                                'misc',
                            description:
                                job?.description ?? baseJob?.description ?? '',
                            include: job?.include ?? baseJob?.include ?? [],
                            exclude: job?.exclude ?? baseJob?.exclude ?? [],
                        };
                    },
                );
            }

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
            const defaults: Config = await this.readTomlDefaults();
            const config = await this.withDiskOverrides(defaults);
            this.instance = new ConfigManager(config);
        }
        return this.instance;
    }

    /**
     * Resets the singleton. Primarily useful for test isolation.
     */
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
     * Re-reads config.toml + runtime.config.json and replaces the
     * cached config.
     *
     * @returns The freshly-loaded {@link Config}.
     */
    public async reload(): Promise<Config> {
        const defaults = await ConfigManager.readTomlDefaults();
        this.config = await ConfigManager.withDiskOverrides(defaults);
        return this.config;
    }

    /**
     * Discards runtime overrides in memory (does not touch disk until
     * save() is called).
     *
     * @returns The reset, defaults-only {@link Config}.
     */
    public async resetToDefaults(): Promise<Config> {
        this.config = await ConfigManager.readTomlDefaults();
        return this.config;
    }

    /**
     * Persists the current in-memory config to runtime.config.json.
     */
    public async save(): Promise<void> {
        await Bun.write(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify(this.config, null, 2),
        );
    }
}
