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

/** A single selectable entry in the interactive main menu. */
export interface MainMenuOptions {
    /** Value returned when this option is selected. */
    value: string;
    /** Display label shown in the menu. */
    label: string;
    /** Optional secondary hint text. */
    hint?: string;
}

/**
 * Defines the contract every Pendex command implements directly.
 * There is no abstract base class — composition, not inheritance.
 */
export interface Command {
    /** Unique identifier for the command, used for menu selection/dispatch. */
    readonly key: string;
    /** Display label shown in the menu. */
    readonly label: string;
    /** Secondary hint text shown alongside the label. */
    readonly hint: string;
    /** Runs the command. */
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
    /** The process's active chainable theme. */
    theme: Theme;
    /** The loaded application configuration. */
    config: Config;
    /** Optional per-category brand colors, derived from the active theme's `[brand]` table. */
    categoryColors?: Partial<Record<Category, string>>;
}

/** Defines the dependencies required by the Exit command. */
export interface ExitState extends State {
    /** Terminates the process with an optional exit code. */
    exit: (code?: number) => void;
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
    /** Maps each compiled output filename to the list of source files consolidated into it. */
    files: Record<string, string[]>;
    /** Maps each compiled output filename to the {@link Category} it was compiled under. Optional for backward compatibility with older manifests. */
    categories?: Record<string, Category>;
    /** Directories that were empty at compile time and so contain no consolidated files. */
    emptyDirectories: string[];
}

/** The set of job categories Pendex recognizes for grouping and coloring output. */
export type Category = 'source' | 'web' | 'style' | 'terminal' | 'configuration' | 'documentation' | 'testing' | 'misc';

/** A single compile job: a named output file built from a set of include/exclude glob patterns. */
export interface Job {
    /** Output filename this job produces. */
    readonly filename: string;
    /** Category this job's output is grouped under. */
    readonly category: Category;
    /** Human-readable description of what this job consolidates. */
    readonly description: string;
    /** Glob patterns for files to include. */
    readonly include: readonly string[];
    /** Glob patterns for files to exclude, applied after `include`. */
    readonly exclude: readonly string[];
}

/** The full application configuration, typically loaded from a config file. */
export interface Config {
    /** Name of a theme file in @pendex/theme's themes/ dir (without .toml), e.g. "pendex", "dracula". */
    theme: ThemeName;
    /** Directory compiled output files are written to. */
    outputDir: string;
    /** Directory split (rebuilt-from-consolidated) output is written to. */
    rebuiltDir: string;
    /** Glob patterns excluded from all jobs globally. */
    exclude: string[];
    /** The compile jobs to run. */
    jobs: Job[];
}
