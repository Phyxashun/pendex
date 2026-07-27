/**
 * @module FileScanner
 *
 * Single responsibility: answering "which files match?" — glob
 * resolution, exclude-list loading, empty-directory detection. Nothing
 * in this file writes an archive, prints anything, or knows about
 * Config/Job shapes beyond the plain string arrays it's handed. It's
 * the "model" layer: pure enough to unit test with a temp directory
 * and zero mocks.
 */

import { dirName } from './Constants';
import type { Job } from './types';

/** Base glob-scan options shared by every scan in this file; `cwd` is set per-call. */
const GLOB_OPTIONS: Bun.GlobScanOptions = {
    cwd: '',
    followSymlinks: false,
    dot: true,
    absolute: false
};
const REGEX_ALL_BACKSLASH = /\\/g;

/**
 * Converts a path to POSIX-style forward slashes.
 *
 * @param p - Path to convert.
 * @returns `p` with all backslashes replaced by forward slashes.
 */
const toPosixPath = (p: string): string => p.replace(REGEX_ALL_BACKSLASH, '/');

/**
 * Reads a .gitignore-style file into a flat list of patterns (comments/
 * blank lines stripped).
 *
 * @param filePath - Path to the ignore-pattern file.
 * @returns The non-comment, non-blank lines, or `[]` if the file doesn't exist.
 */
export async function loadIgnorePatterns(filePath: string): Promise<string[]> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return [];
    const content = await file.text();
    return content.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
}

/**
 * Resolves the file set for one job.
 *
 * A job with a non-empty `include` list matches the normal way: union of
 * its include globs, minus excludes.
 *
 * A job with an **empty** `include` list is treated as a *remainder* job
 * (e.g. `8_MISC_FILES` in config.toml, described as "all remaining
 * project files"): it scans every file under `cwd` and keeps whatever no
 * earlier job has already claimed. `claimedPaths` is shared and mutated
 * by the caller across jobs — this function only reads it, so job order
 * matters (remainder jobs must run after the jobs whose leftovers they're
 * meant to catch; config.toml lists MISC last for this reason).
 *
 * @param job - The job to resolve files for.
 * @param excludes - Glob patterns to exclude from the result.
 * @param claimedPaths - Paths already claimed by earlier jobs (read-only; not mutated here).
 * @param cwd - Directory to scan from (default `'.'`).
 * @returns The list of file paths this job matches.
 */
export async function resolveJobFiles(
    job: Job,
    excludes: string[],
    claimedPaths: ReadonlySet<string>,
    cwd: string = '.'
): Promise<string[]> {
    const excludeGlobs = excludes.map(pattern => new Bun.Glob(pattern));
    const matches = new Set<string>();
    const isRemainderJob = job.include.length === 0;
    GLOB_OPTIONS.cwd = cwd;

    if (isRemainderJob) {
        for await (const file of new Bun.Glob('**/*').scan(GLOB_OPTIONS)) {
            const posixFile = toPosixPath(file);

            if (claimedPaths.has(posixFile)) continue;
            if (excludeGlobs.some(glob => glob.match(posixFile))) continue;

            matches.add(file);
        }
        return [...matches];
    }

    for (const pattern of job.include) {
        const files = new Bun.Glob(pattern).scan(GLOB_OPTIONS);
        for await (const file of files) {
            if (!excludeGlobs.some(exclude => exclude.match(toPosixPath(file)))) {
                matches.add(file);
            }
        }
    }
    return [...matches];
}

/**
 * Finds directories under `cwd` (excluding `excludes`) that contain no
 * files or subdirectories.
 *
 * @param cwd - Directory to scan from.
 * @param excludes - Glob patterns for directories to skip.
 * @returns Paths of directories with an entirely empty subtree.
 */
export async function findEmptyDirectories(
    cwd: string,
    excludes: string[]
): Promise<string[]> {
    const excludeGlobs = excludes.map(pattern => new Bun.Glob(pattern));
    GLOB_OPTIONS.cwd = cwd;

    // Match a candidate directory against the exclude globs in BOTH
    // trailing-slash forms. Some exclude patterns are written with a
    // trailing slash ("node_modules/"), some without ("node_modules/**")
    // — matching only one form silently let excluded directories through
    // depending on which style the caller used.
    const isExcludedDir = (posixDir: string): boolean =>
        excludeGlobs.some(glob => glob.match(posixDir) || glob.match(`${posixDir}/`));

    // Every file AND directory entry under cwd. Bun.Glob('**/') (the
    // directory-only shorthand) does NOT reliably surface a directory
    // whose entire subtree contains no files — verified directly: given
    // src/nested-empty (zero files anywhere beneath it) alongside
    // src/a.ts, '**/' finds "src" (it contains a file) but never finds
    // "src/nested-empty". '**/*' with onlyFiles:false does not have that
    // gap, so it's used for both loops below; the directory list is
    // derived by set difference (every entry that isn't a known file)
    // instead of trusting a directory-only pattern or a trailing-slash
    // convention on the results (glob results carry no trailing slash
    // for directories either way, in either pattern).
    const allEntries = new Set<string>();
    for await (const entry of new Bun.Glob('**/*').scan({ ...GLOB_OPTIONS, onlyFiles: false })) {
        allEntries.add(toPosixPath(entry));
    }

    // Files, and (from their parent chain) every directory that contains
    // at least one file at any depth.
    const allFiles = new Set<string>();
    const nonEmptyDirs = new Set<string>();
    for await (const file of new Bun.Glob('**/*').scan({ ...GLOB_OPTIONS, onlyFiles: true })) {
        const posixFile = toPosixPath(file);
        allFiles.add(posixFile);

        let parent = dirName(file);
        while (parent && parent !== '.') {
            nonEmptyDirs.add(toPosixPath(parent));
            parent = dirName(parent);
        }
    }

    const allDirs = new Set<string>();
    for (const entry of allEntries) {
        if (allFiles.has(entry)) continue; // it's a file, not a directory
        if (entry && !isExcludedDir(entry)) allDirs.add(entry);
    }

    const emptyDirs: string[] = [];
    for (const dir of allDirs) {
        if (!nonEmptyDirs.has(dir)) {
            emptyDirs.push(dir);
        }
    }

    return emptyDirs;
}
