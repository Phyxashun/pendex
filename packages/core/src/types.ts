// FILE-PATH: packages/core/src/types.ts
//
/**
 * @module types
 * @file FILE-PATH: packages/core/src/types.ts
 *
 * Single responsibility: contracts shared by `@pendex/compile` and
 * `@pendex/split` (and consumed by the pendex CLI shell) — the domain
 * model ({@link Config}/{@link Job}/{@link Category}/{@link Manifest})
 * and the command/view layer's shared shapes ({@link Command}/
 * {@link State}/{@link ExitState}). Neither compile nor split owns
 * these; putting them in the shell package instead would make
 * compile/split depend on the shell, inverting the real dependency
 * direction. This is the same reasoning that put `ArchiveFormat.ts`
 * here rather than in either service.
 */

import type { Theme, ThemeName } from '@pendex/theme';
export type { Theme, ThemeName };

/**
 * A single selectable entry in the interactive main menu.
 */
export interface MainMenuOptions {
    // Value returned when this option is selected.
    value: string;
    // Display label shown in the menu.
    label: string;
    // Optional secondary hint text.
    hint?: string;
}

/**
 * Defines the contract every Pendex command implements directly.
 * There is no abstract base class — composition, not inheritance.
 */
export interface Command {
    // Unique identifier for the command, used for menu selection/dispatch.
    readonly key: string;
    // Display label shown in the menu.
    readonly label: string;
    // Secondary hint text shown alongside the label.
    readonly hint: string;
    // Runs the command.
    execute(): Promise<void>;
}

/**
 * Represents the application's global state, including the
 * active theme and the loaded configuration.
 *
 * Shared dependency shape for commands that can run either inside
 * the interactive Application shell or standalone via `import.meta.main`.
 *
 * `categoryColors` is derived from the active theme's `[brand]` table
 * (see the pendex CLI's bootstrap.ts) — undefined for any theme that
 * doesn't define one, or doesn't cover a given Category. Views fall
 * back to a semantic theme style (e.g. theme.bold) wherever a category
 * has no brand color, so coloring by category is a pure enhancement,
 * never a requirement a theme must satisfy.
 */
export interface State {
    // The process's active chainable theme.
    theme: Theme;
    // The loaded application configuration.
    config: Config;
    // Optional per-category brand colors, derived from the
    // active theme's `[brand]` table.
    categoryColors?: Partial<Record<Category, string>>;
}

export type ExitFn = (code?: number | string | null) => never;

/**
 * Defines the dependencies required by the Exit command.
 */
export interface ExitState extends State {
    // Terminates the process with an optional exit code.
    exit: ExitFn;
    // Tracks the exit code throughout execution
    exitCode: number;
}

/**
 * Defines the structure of the manifest file, which tracks
 * consolidated files and empty directories.
 *
 * `categories` maps each job's filename to the Category it was compiled
 * under — optional so a manifest written by an older Pendex version
 * still parses; anything reading it (category-colored split output)
 * degrades to no coloring when it's absent.
 */
export interface Manifest {
    // Maps each compiled output filename to the list of source
    // files consolidated into it.
    files: Record<string, string[]>;
    // Maps each compiled output filename to the {@link Category}
    // it was compiled under. Optional for backward compatibility
    // with older manifests.
    categories?: Record<string, Category>;
    // Directories that were empty at compile time and
    // so contain no consolidated files.
    emptyDirectories: string[];
}

/**
 * The set of job categories Pendex recognizes for grouping and coloring output.
 */
export type Category =
    | 'source' // Source files
    | 'web' // Web site files
    | 'style' // Web style files
    | 'terminal' // Terminal/CLI files
    | 'configuration' // Config files
    | 'documentation' // Documentation files
    | 'testing' // Test files
    | 'cspell' // CSpell config files and dictionaries
    | 'misc'; // Anything not covered by previous categories (except .svg files)

/**
 * A single compile job: a named output file built from a set of include/exclude
 * glob patterns.
 */
export interface Job {
    // Output filename this job produces.
    readonly filename: string;
    // Category this job's output is grouped under.
    readonly category: Category;
    // Human-readable description of what this job consolidates.
    readonly description: string;
    // Glob patterns for files to include.
    readonly include: readonly (string | undefined)[];
    // Glob patterns for files to exclude, applied after `include`.
    readonly exclude: readonly (string | undefined)[];
}

export interface ThemeConfig {
    // Name of a theme file in the themes dir (without .toml),
    // e.g. "pendex", "dracula".
    name: ThemeName;
    // Path to the themes dir.
    path: string;
}

export type CompileOutputType = 'txt' | 'pdf';

/**
 * The full application configuration, typically loaded from a config file.
 */
export interface Config {
    // Theme configuration information.
    theme: ThemeConfig;
    // Keep http(s) in files?
    http: boolean;
    // Output type
    outputType: CompileOutputType;
    // Directory compiled output files are written to.
    outputDir: string;
    // Directory split (rebuilt-from-consolidated) output is written to.
    rebuiltDir: string;
    // Glob patterns excluded from all jobs globally.
    exclude: string[];
    // The compile jobs to run.
    jobs: Job[];
}

export type StyleFunction = (text: string) => string;

export type StandaloneExecution = () => Promise<void>;

// DeepPartial helper allows us to type disk data safely
export type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

/**
 * Represents the loose, unchecked data layout when loading configuration files
 * from disk before defaults are applied.
 */
export type RawDiskConfig = DeepPartial<Config> & {
    // Overriding specific properties if needed to make them completely optional
    // Theme configuration information.
    theme?: ThemeConfig;
    // Keep http(s) in files?
    http?: boolean;
    // Output type
    outputType?: CompileOutputType;
    // Directory compiled output files are written to.
    outputDir?: string;
    // Directory split (rebuilt-from-consolidated) output is written to.
    rebuiltDir?: string;
    // Glob patterns excluded from all jobs globally.
    exclude?: Array<DeepPartial<string>>;
    // The compile jobs to run.
    jobs?: Array<DeepPartial<Job>>;
};
