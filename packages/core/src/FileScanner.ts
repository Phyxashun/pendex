//
// SINGLE RESPONSIBILITY: answering "which files match?" — glob resolution,
// exclude-list loading, empty-directory detection. Nothing in this file
// writes an archive, prints anything, or knows about Config/Job shapes
// beyond the plain string arrays it's handed. It's the "model" layer:
// pure enough to unit test with a temp directory and zero mocks.

import { dirName } from './Constants';
import type { Job } from './types';

const GLOB_OPTIONS: Bun.GlobScanOptions = {
    cwd: '',
    followSymlinks: false,
    dot: true,
    absolute: false
};
const REGEX_TRAILING_SLASH = /\/$/;
const REGEX_ALL_BACKSLASH = /\\/g;
const toPosixPath = (p: string): string => p.replace(REGEX_ALL_BACKSLASH, '/');

/**
 * Reads a .gitignore-style file into a flat list of patterns (comments/
 * blank lines stripped).
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
 */
export async function findEmptyDirectories(
    cwd: string,
    excludes: string[]
): Promise<string[]> {
    const excludeGlobs = excludes.map(pattern => new Bun.Glob(pattern));
    GLOB_OPTIONS.cwd = cwd;

    // Get all directories.
    const allDirs = new Set<string>();
    for await (const dir of new Bun.Glob('**/').scan({ ...GLOB_OPTIONS, onlyFiles: false })) {
        const posixDir = toPosixPath(dir).replace(REGEX_TRAILING_SLASH, '');
        if (posixDir && !excludeGlobs.some(glob => glob.match(posixDir))) {
            allDirs.add(posixDir);
        }
    }

    // Get all directories that contain at least one file.
    const nonEmptyDirs = new Set<string>();
    for await (const file of new Bun.Glob('**/*').scan({ ...GLOB_OPTIONS, onlyFiles: true })) {
        let parent = dirName(file);
        while (parent && parent !== '.') {
            const posixParent = toPosixPath(parent);
            if (!nonEmptyDirs.has(posixParent)) {
                nonEmptyDirs.add(posixParent);
            }
            parent = dirName(parent);
        }
    }

    // The difference between the two sets is our empty directories.
    const emptyDirs: string[] = [];
    for (const dir of allDirs) {
        if (!nonEmptyDirs.has(dir)) {
            emptyDirs.push(dir);
        }
    }

    return emptyDirs;
}
