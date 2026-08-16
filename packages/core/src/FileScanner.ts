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

import { dirName, toPosixPath } from './Constants';
import type { Job } from './types';

/**
 * Base glob-scan options shared by every scan in this file; `cwd` is
 * set per-call.
 */
const GLOB_OPTIONS: Bun.GlobScanOptions = {
    cwd: '',
    followSymlinks: false,
    dot: true,
    absolute: false
};

/**
 * Reads a .gitignore-style file and converts to a flat list of patterns
 * with comments and blank lines stripped.
 *
 * @param filePath - Path to the ignore-pattern file.
 * @returns The non-comment, non-blank lines, or `[]` if the file doesn't exist.
 */
export async function loadIgnorePatterns(filePath: string): Promise<string[]> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return [];

    const content = await file.text();

    return content
        .split(/\r?\n/)
        // Trim whitespace from both ends
        .map(line => line.trim())
        // Remove empty lines and comments
        .filter(line => line.trim() && !line.startsWith('#'));
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
 * @param claimedPaths - Paths already claimed by earlier jobs
 *  (read-only; not mutated here).
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

    // Safely combine global options with the local cwd for this specific run
    const scanOptions: Bun.GlobScanOptions = {
        ...GLOB_OPTIONS,
        cwd
    };

    if (isRemainderJob) {
        for await (const file of new Bun.Glob('**/*').scan(scanOptions)) {
            const posixFile = toPosixPath(file);

            if (claimedPaths.has(posixFile)) continue;
            if (excludeGlobs.some(glob => glob.match(posixFile))) continue;

            matches.add(file);
        }
        return [...matches];
    }

    for (const pattern of job.include) {
        const files = new Bun.Glob(pattern).scan(scanOptions);
        for await (const file of files) {
            const posixFile = toPosixPath(file);

            if (!excludeGlobs.some(exclude => exclude.match(toPosixPath(posixFile)))) {
                matches.add(file);
            }
        }
    }
    return [...matches];
}

/**
 * Match a candidate directory against the exclude globs in BOTH
 * trailing - slash forms.Some exclude patterns are written with a
 * trailing slash("node_modules/"), some without("node_modules/**")
 * — matching only one form silently let excluded directories through
 * depending on which style the caller used.
 */
const isExcludedDir = (excludeGlobs: string[], posixDir: string): boolean => {
    return excludeGlobs.some(glob => glob.match(posixDir) || glob.match(`${posixDir}/`));
};

/**
 * Finds directories under `cwd` (excluding `excludes`) that contain no
 * files or subdirectories.
 *
 * @param cwd - Directory to scan from.
 * @param excludes - Glob patterns for directories to skip.
 * @returns Paths of directories with an entirely empty subtree.
 */
export async function findEmptyDirectories(cwd: string, excludes: string[]): Promise<string[]> {
    const excludeGlobs = excludes.map(pattern => new Bun.Glob(pattern));

    const scanOptions: Bun.GlobScanOptions = {
        ...GLOB_OPTIONS,
        cwd
    };

    const allEntries = new Set<string>();

    const dirGlobs = new Bun.Glob('**/*').scan({ ...scanOptions, onlyFiles: false });
    for await (const entry of dirGlobs) {
        allEntries.add(toPosixPath(entry));
    }

    const allFiles = new Set<string>();
    const nonEmptyDirs = new Set<string>();

    const fileGlobs = new Bun.Glob('**/*').scan({ ...scanOptions, onlyFiles: true });
    for await (const file of fileGlobs) {
        const posixFile = toPosixPath(file);
        allFiles.add(posixFile);

        let parent = dirName(posixFile);
        while (parent && parent !== '.') {
            nonEmptyDirs.add(parent);
            parent = dirName(parent);
        }
    }

    const allDirs = new Set<string>();
    for (const entry of allEntries) {
        if (allFiles.has(entry)) continue;
        if (entry && !isExcludedDir(excludeGlobs, entry)) allDirs.add(entry);
    }

    const emptyDirs: string[] = [];
    for (const dir of allDirs) {
        if (!nonEmptyDirs.has(dir)) {
            emptyDirs.push(dir);
        }
    }

    return emptyDirs;
}
