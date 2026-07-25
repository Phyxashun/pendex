// FILE-PATH: packages/core/src/types.ts
//
// SINGLE RESPONSIBILITY: contracts shared by @pendex/compile and
// @pendex/split (and consumed by the pendex CLI shell) — the domain
// model (Config/Job/Category/Manifest) and the command/view layer's
// shared shapes (Command/State/ExitState). Neither compile nor split
// owns these; putting them in the shell package instead would make
// compile/split depend on the shell, inverting the real dependency
// direction. This is the same reasoning that put ArchiveFormat.ts here
// rather than in either service.

import type { Theme, ThemeName } from '@pendex/theme';

export type { Theme, ThemeName };

export interface MainMenuOptions {
    value: string;
    label: string;
    hint?: string;
}

/**
 * Defines the contract every Pendex command implements directly.
 * There is no abstract base class — composition, not inheritance.
 */
export interface Command {
    readonly key: string;
    readonly label: string;
    readonly hint: string;
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
    theme: Theme;
    config: Config;
    categoryColors?: Partial<Record<Category, string>>;
}

/** Defines the dependencies required by the Exit command. */
export interface ExitState extends State {
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
    files: Record<string, string[]>;
    categories?: Record<string, Category>;
    emptyDirectories: string[];
}

export type Category = 'source' | 'web' | 'style' | 'terminal' | 'configuration' | 'documentation' | 'testing' | 'misc';

export interface Job {
    readonly filename: string;
    readonly category: Category;
    readonly description: string;
    readonly include: readonly string[];
    readonly exclude: readonly string[];
}

export interface Config {
    /** Name of a theme file in @pendex/theme's themes/ dir (without .toml), e.g. "pendex", "dracula". */
    theme: ThemeName;
    outputDir: string;
    rebuiltDir: string;
    exclude: string[];
    jobs: Job[];
}
