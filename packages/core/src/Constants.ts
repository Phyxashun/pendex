/**
 * @module Constants
 *
 * Single responsibility: generic, app-wide constants (paths, dividers)
 * and tiny path-string helpers. This file does NOT know what an
 * "archive banner" looks like — that's `core/ArchiveFormat.ts`'s job.
 * Keeping the two apart means changing the on-disk archive format never
 * requires touching this file, and vice versa.
 */

/**
 * Basename of a path, tolerant of both `/` and `\` separators.
 *
 * @param filePath - The path to extract the basename from.
 * @returns The final path segment (filename).
 */
export const baseName = (filePath: string): string => {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.slice(normalized.lastIndexOf('/') + 1);
};

/**
 * Extension of a path, including the leading dot (empty string if none).
 *
 * @param filePath - The path to extract the extension from.
 * @returns The extension including its leading dot, or `''` if there is none.
 */
export const extName = (filePath: string): string => {
    const base = baseName(filePath);
    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.slice(dotIndex) : '';
};

/**
 * Directory portion of a path ('.' if there is none).
 *
 * @param filePath - The path to extract the directory from.
 * @returns The directory portion of `filePath`, or `'.'` if there is none.
 */
export const dirName = (filePath: string): string => {
    const normalized = filePath.replace(/\\/g, '/');
    const slashIndex = normalized.lastIndexOf('/');
    return slashIndex === -1 ? '.' : normalized.slice(0, slashIndex);
};

/**
 * Joins path segments with a single '/', collapsing accidental doubles.
 *
 * @param segments - Path segments to join; falsy segments are dropped.
 * @returns The joined path.
 */
export const joinPath = (...segments: string[]): string =>
    segments
        .filter(Boolean)
        .join('/')
        .replace(/\/{2,}/g, '/');

/**
 * Backing class for the {@link Constants} singleton. `BASE_DIR` and
 * anything derived from it are getters rather than frozen fields so
 * they always reflect the current `process.cwd()` — important for test
 * sandboxes that `chdir` after the module first loads.
 */
class ConstantsManager {
    // Getters, not frozen fields: BASE_DIR (and anything derived from it)
    // must reflect the CURRENT process.cwd() at the moment it's read, not
    // whatever cwd happened to be true the first time this singleton was
    // constructed. A `readonly BASE_DIR = process.cwd()` field freezes at
    // module-first-import time — any later process.chdir() (every test
    // sandbox does this) would be invisible to it, silently pointing
    // .gitignore/runtime.config.json lookups at the wrong directory.
    /** The current process's working directory, read live on every access. */
    public get BASE_DIR(): string { return process.cwd(); }
    /** Default directory name for compiled output. */
    public readonly OUTPUT_DIR = 'ALL';
    /** Default directory name for split (rebuilt) output. */
    public readonly REBUILT_DIR = 'ALL_REBUILT';
    /** Absolute path to `.gitignore` under {@link BASE_DIR}. */
    public get GITIGNORE_PATH(): string { return joinPath(this.BASE_DIR, '.gitignore'); }
    /** Absolute path to `runtime.config.json` under {@link BASE_DIR}. */
    public get RUNTIME_CONFIG_PATH(): string { return joinPath(this.BASE_DIR, 'runtime.config.json'); }
    /** Text encoding used when reading/writing files. */
    public readonly ENCODING = 'utf-8';

    private readonly BLOCK = '█';
    private readonly WIDTH = 40;

    /** A fixed-width horizontal rule string, used for CLI section dividers. */
    public readonly DIVIDER = this.BLOCK.repeat(this.WIDTH);
}

/** Shared singleton exposing app-wide constants and live path getters. */
export const Constants = new ConstantsManager();
