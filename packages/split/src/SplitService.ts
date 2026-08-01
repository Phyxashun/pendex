/**
 * @module SplitService
 *
 * Single responsibility: *do* the split — read the manifest, parse each
 * archive, rewrite the original files — and hand back plain data. Same
 * "hook" role as `CompileService`: depends on `ArchiveFormat` for
 * parsing, never imports `@clack/prompts`.
 */

import { dirName, joinPath } from '@pendex/core';
import type { Manifest } from '@pendex/core';
import { archivePathFor, parseArchive } from '@pendex/core';

/** Outcome of splitting a single job's archive back into real files. */
export interface SplitFileOutcome {
    /** The job's archive filename. */
    readonly filename: string;
    /** Whether the archive file existed on disk. */
    readonly archiveFound: boolean;
    /** Number of files successfully recreated from this archive. */
    readonly filesRecreated: number;
}

/** Full summary returned after a split run completes. */
export interface SplitSummary {
    /** Whether `manifest.json` was found in the output directory. */
    readonly manifestFound: boolean;
    /** Per-file outcomes, in manifest order. */
    readonly fileOutcomes: SplitFileOutcome[];
    /** Total files recreated across every archive. */
    readonly totalFilesRecreated: number;
}

/** Optional progress callbacks a caller (e.g. the interactive CLI view) can hook into a split run. */
export interface SplitHooks {
    /** Called once, after the manifest is read, before any files are split. */
    onSplitStart?: (manifest: Manifest) => void | Promise<void>;
    /** Called before a job's archive starts splitting. */
    onFileStart?: (filename: string) => void | Promise<void>;
    /** Called after a job's archive finishes splitting. */
    onFileSuccess?: (
        filename: string,
        outcome: SplitFileOutcome,
    ) => void | Promise<void>;
}

/**
 * Reads and parses manifest.json from an output directory, or null if it doesn't exist.
 *
 * @param outputDir - Directory to read `manifest.json` from.
 * @returns The parsed {@link Manifest}, or `null` if the file doesn't exist.
 */
export async function readManifest(
    outputDir: string,
): Promise<Manifest | null> {
    const manifestFile = Bun.file(joinPath(outputDir, 'manifest.json'));
    if (!(await manifestFile.exists())) return null;
    return manifestFile.json() as Promise<Manifest>;
}

/**
 * Wipes the rebuild directory.
 *
 * @param dir - Directory to remove.
 */
export async function prepareRebuildDirectory(dir: string): Promise<void> {
    await Bun.$`rm -rf ${dir}`;
}

/**
 * Recreates every empty directory recorded in the manifest.
 *
 * @param rebuiltDir - Base rebuild directory.
 * @param emptyDirectories - Directory paths (relative to the original project root) to recreate.
 */
export async function restoreEmptyDirectories(
    rebuiltDir: string,
    emptyDirectories: string[],
): Promise<void> {
    await Promise.all(
        emptyDirectories.map(
            dir => Bun.$`mkdir -p ${joinPath(rebuiltDir, dir)}`,
        ),
    );
}

/**
 * Splits one job's archive back into real files under `rebuiltDir`.
 * A missing source .txt is not an error — it just means nothing to
 * recreate for that job. Corrupt or unterminated entries inside the
 * archive are simply absent from parseArchive()'s results, so they're
 * skipped without failing the rest of the job.
 *
 * @param outputDir - Directory containing the compiled archive files.
 * @param rebuiltDir - Directory to recreate original files into.
 * @param filename - The job's archive filename.
 * @returns The split outcome for this job.
 */
export async function splitArchiveFile(
    outputDir: string,
    rebuiltDir: string,
    filename: string,
): Promise<SplitFileOutcome> {
    const archiveFile = Bun.file(archivePathFor(outputDir, filename));
    if (!(await archiveFile.exists())) {
        return { filename, archiveFound: false, filesRecreated: 0 };
    }

    const rawText = await archiveFile.text();
    const archivedFiles = parseArchive(rawText);

    let filesRecreated = 0;
    for (const archived of archivedFiles) {
        const writePath = joinPath(rebuiltDir, archived.originalPath);
        await Bun.$`mkdir -p ${dirName(writePath)}`;
        await Bun.write(writePath, archived.content);
        filesRecreated++;
    }

    return { filename, archiveFound: true, filesRecreated };
}

/**
 * Splits every job archive listed in `manifest.files`, in order, and
 * returns a full summary. Headless counterpart to views/SplitView.ts.
 *
 * @param outputDir - Directory containing the compiled archive files and manifest.
 * @param rebuiltDir - Directory to recreate original files into.
 * @param hooks - Optional progress callbacks.
 * @returns The full {@link SplitSummary} for this run.
 */
export async function runSplit(
    outputDir: string,
    rebuiltDir: string,
    hooks?: SplitHooks,
): Promise<SplitSummary> {
    const manifest = await readManifest(outputDir);
    if (!manifest) {
        return {
            manifestFound: false,
            fileOutcomes: [],
            totalFilesRecreated: 0,
        };
    }

    if (hooks?.onSplitStart) {
        await hooks.onSplitStart(manifest);
    }

    await prepareRebuildDirectory(rebuiltDir);
    await restoreEmptyDirectories(rebuiltDir, manifest.emptyDirectories ?? []);

    const fileOutcomes: SplitFileOutcome[] = [];

    for (const filename of Object.keys(manifest.files)) {
        if (hooks?.onFileStart) {
            await hooks.onFileStart(filename);
        }

        const outcome = await splitArchiveFile(outputDir, rebuiltDir, filename);
        fileOutcomes.push(outcome);

        if (hooks?.onFileSuccess) {
            await hooks.onFileSuccess(filename, outcome);
        }
    }

    return {
        manifestFound: true,
        fileOutcomes,
        totalFilesRecreated: fileOutcomes.reduce(
            (sum, o) => sum + o.filesRecreated,
            0,
        ),
    };
}

/**
 * Reads the manifest and prepares the rebuild directory (wipe + restore
 * empty dirs) for a manually-sequenced split — used by callers that
 * want to split jobs one at a time via {@link splitSingleFile} rather
 * than all at once via {@link runSplit}.
 *
 * @param outputDir - Directory containing the compiled archive files and manifest.
 * @param rebuiltDir - Directory to recreate original files into.
 * @returns The read manifest, or `null` if `manifest.json` wasn't found.
 */
export async function initializeSplit(
    outputDir: string,
    rebuiltDir: string,
): Promise<{ manifest: Manifest } | null> {
    const manifest = await readManifest(outputDir);
    if (!manifest) return null;

    await prepareRebuildDirectory(rebuiltDir);
    await restoreEmptyDirectories(rebuiltDir, manifest.emptyDirectories ?? []);

    return { manifest };
}

/**
 * Splits a single job's archive. A thin wrapper around
 * {@link splitArchiveFile} for callers sequencing jobs manually.
 *
 * @param outputDir - Directory containing the compiled archive files.
 * @param rebuiltDir - Directory to recreate original files into.
 * @param filename - The job's archive filename.
 * @returns The split outcome for this job.
 */
export async function splitSingleFile(
    outputDir: string,
    rebuiltDir: string,
    filename: string,
): Promise<SplitFileOutcome> {
    return await splitArchiveFile(outputDir, rebuiltDir, filename);
}
