// FILE-PATH: packages/core/src/Constants.ts
//
import path from 'node:path';

export type PathStringFn = (path: string) => string;

export type PathSegment = string | number;

export type PossiblePathSegment = PathSegment | false | null | undefined;

export type Path = (...segments: PossiblePathSegment[]) => string;

/**
 * @module Constants
 *
 * Single responsibility: generic, app-wide constants (paths, dividers)
 * and tiny path-string helpers. This file does NOT know what an
 * "archive banner" looks like — that's `core/ArchiveFormat.ts`'s job.
 * Keeping the two apart means changing the on-disk archive format never
 * requires touching this file, and vice versa.
 */

export const SEPARATOR = '/';
export const PATH_SEPARATOR_REGEX = /\\/g;
export const CONSECUTIVE_SLASH_REGEX = /(?<!^)(?<!\b[a-zA-Z]{2,}:)\/{2,}/g;

/**
 * Converts a path to POSIX-style forward slashes.
 *
 * @param filePath - Path to convert.
 * @returns `filePath` with all backslashes replaced by forward slashes.
 */
export const toPosixPath: PathStringFn = (filePath: string): string => {
    return filePath.replace(PATH_SEPARATOR_REGEX, SEPARATOR);
};

/**
 * Normalizes all slashes to a standard web-safe format.
 * Exported so other modules can validate untrusted raw config string inputs.
 *
 * @param filePath - Path to convert.
 * @returns `filePath` with all double forward slashes replaced by
 *  single forward slashes.
 */
export const normalizePath: PathStringFn = (filePath: string): string => {
    const result: string = toPosixPath(filePath);
    return result.replace(CONSECUTIVE_SLASH_REGEX, SEPARATOR);
};

/**
 * Joins path segments with a single '/', collapsing accidental doubles.
 * Adjusted signature to safely accept and drop falsy conditional values.
 *
 * @param segments - Path segments to join; falsy segments are dropped.
 * @returns The joined path.
 */
export const joinPath: Path = (...segments: PossiblePathSegment[]): string => {
    const allSegments = segments.filter(Boolean) as PathSegment[];

    // Convert each segment to a posix path
    const posixPath: string = allSegments
        .map((segment: PathSegment): string => toPosixPath(String(segment)))
        .join(SEPARATOR);

    // Normalize entire combined string
    return normalizePath(posixPath);
};

/**
 * Basename of a path, tolerant of both `/` and `\` separators.
 *
 * @param filePath - The path to extract the basename from.
 * @returns The final path segment (filename).
 */
export const baseName: PathStringFn = (filePath: string): string => {
    return path.basename(toPosixPath(filePath));
};

/**
 * Extension of a path, including the leading dot (empty string if none).
 *
 * @param filePath - The path to extract the extension from.
 * @returns The extension including its leading dot, or `''` if there is none.
 */
export const extName: PathStringFn = (filePath: string): string => {
    return path.extname(toPosixPath(filePath));
};

/**
 * Directory portion of a path ('.' if there is none).
 *
 * @param filePath - The path to extract the directory from.
 * @returns The directory portion of `filePath`, or `'.'` if there is none.
 */
export const dirName: PathStringFn = (filePath: string): string => {
    return path.dirname(toPosixPath(filePath));
};

/**
 * Backing class for the {@link Constants} singleton. `BASE_DIR` and
 * anything derived from it are getters rather than frozen fields so
 * they always reflect the current `process.cwd()` — important for test
 * sandboxes that `chdir` after the module first loads.
 */
class ConstantsManager {
    private readonly BLOCK = '█';

    private readonly WIDTH = 40;

    /**
     * The current process's working directory, read live on every access.
     */
    public readonly BASE_DIR: string = toPosixPath(process.cwd());

    /**
     * Absolute path to `.gitignore` under {@link BASE_DIR}.
     */
    public readonly GITIGNORE_PATH: string = joinPath(
        this.BASE_DIR,
        '.gitignore',
    );

    /**
     * Absolute path to `runtime.config.json` under {@link BASE_DIR}.
     */
    public readonly RUNTIME_CONFIG_PATH: string = joinPath(
        this.BASE_DIR,
        'runtime.config.json',
    );

    /**
     * Default directory name for compiled output.
     */
    public readonly OUTPUT_DIR = 'ALL';

    /**
     * Default directory name for split (rebuilt) output.
     */
    public readonly REBUILT_DIR = 'ALL_REBUILT';

    /**
     * Text encoding used when reading/writing files.
     */
    public readonly ENCODING = 'utf-8';

    /**
     * A fixed-width horizontal rule string, used for CLI section dividers.
     */
    public readonly DIVIDER = this.BLOCK.repeat(this.WIDTH);

    constructor() {}
}

/**
 * Shared singleton exposing app-wide constants and live path getters.
 */
export const Constants = new ConstantsManager();
