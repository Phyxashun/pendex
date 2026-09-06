// FILE-PATH: packages/split/src/SplitService.ts

/**
 * @module SplitService
 *
 * Single responsibility: *do* the split — read the manifest, parse each
 * archive, rewrite the original files — and hand back plain data. Same
 * "hook" role as `CompileService`: depends on `ArchiveFormat` for
 * parsing, never imports `@clack/prompts`.
 */

import { mkdir, rm } from 'node:fs/promises';

import {
    dirName,
    joinPath,
    normalizePath,
    parseArchive,
    type Manifest,
} from '@pendex/core';

/**
 * Outcome of splitting a single job's archive back into real files.
 */
export interface SplitFileOutcome {
    // The job's archive filename.
    readonly filename: string;
    // Whether the archive file existed on disk.
    readonly archiveFound: boolean;
    // Number of files successfully recreated from this archive.
    readonly filesRecreated: number;
}

/**
 * Full summary returned after a split run completes.
 */
export interface SplitSummary {
    // Whether `manifest.json` was found in the output directory.
    readonly manifestFound: boolean;
    // Per-file outcomes, in manifest order.
    readonly fileOutcomes: SplitFileOutcome[];
    // Total files recreated across every archive.
    readonly totalFilesRecreated: number;
}

/**
 * Optional progress callbacks a caller (e.g. the interactive CLI
 * view) can hook into a split run.
 */
export interface SplitHooks {
    // Called once, after the manifest is read, before any files are split.
    onSplitStart?: (manifest: Manifest) => void | Promise<void>;
    // Called before a job's archive starts splitting.
    onFileStart?: (filename: string) => void | Promise<void>;
    // Called after a job's archive finishes splitting.
    onFileSuccess?: (
        filename: string,
        outcome: SplitFileOutcome,
    ) => void | Promise<void>;
}

/**
 * Reads and parses manifest.json from an output directory, or null if
 * it doesn't exist.
 *
 * @param outputDir - Directory to read `manifest.json` from.
 * @returns The parsed {@link Manifest}, or `null` if the file doesn't exist.
 */
export async function readManifest(
    outputDir: string,
): Promise<Manifest | null> {
    const normalizedPath = normalizePath(outputDir);
    const manifestFile = Bun.file(joinPath(normalizedPath, 'manifest.json'));

    if (!(await manifestFile.exists())) {
        return null;
    }

    return manifestFile.json() as Promise<Manifest>;
}

/**
 * Wipes the rebuild directory natively.
 *
 * @param dir - Directory to remove.
 */
export async function prepareRebuildDirectory(dir: string): Promise<void> {
    const normalizedPath = normalizePath(dir);

    await rm(normalizedPath, {
        recursive: true,
        force: true,
    });
}

/**
 * Recreates every empty directory recorded in the manifest safely.
 *
 * @param rebuiltDir - Base rebuild directory.
 * @param emptyDirectories - Directory paths to recreate.
 */
export async function restoreEmptyDirectories(
    rebuiltDir: string,
    emptyDirectories: string[],
): Promise<void> {
    const normalizedPath = normalizePath(rebuiltDir);

    for (const dir of emptyDirectories) {
        await mkdir(joinPath(normalizedPath, dir), {
            recursive: true,
        });
    }
}

/**
 * Splits one job's archive back into real files under `rebuiltDir`.
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
    const normalizedOutputPath = normalizePath(outputDir);
    const normalizedRebuiltPath = normalizePath(rebuiltDir);

    const resolvedPath = joinPath(normalizedOutputPath, filename);
    const archiveFile = Bun.file(resolvedPath);
    if (!(await archiveFile.exists())) {
        return {
            filename,
            archiveFound: false,
            filesRecreated: 0,
        };
    }

    const rawText = await archiveFile.text();
    const archivedFiles = parseArchive(rawText);

    let filesRecreated = 0;
    for (const archived of archivedFiles) {
        const normalizedArchivedPath = normalizePath(archived.originalPath);
        const writePath = joinPath(
            normalizedRebuiltPath,
            normalizedArchivedPath,
        );

        await mkdir(dirName(writePath), {
            recursive: true,
        });
        await Bun.write(writePath, archived.content);

        filesRecreated++;
    }

    return {
        filename,
        archiveFound: true,
        filesRecreated,
    };
}

/**
 * Splits every job archive listed in `manifest.files`, in order, and
 * returns a full summary. Headless counterpart to views/SplitView.ts.
 *
 * @param outputDir - Directory containing the compiled archive files
 *  and manifest.
 * @param rebuiltDir - Directory to recreate original files into.
 * @param hooks - Optional progress callbacks.
 * @returns The full {@link SplitSummary} for this run.
 */
export async function runSplit(
    outputDir: string,
    rebuiltDir: string,
    hooks?: SplitHooks,
): Promise<SplitSummary> {
    const normalizedOutputPath = normalizePath(outputDir);
    const normalizedRebuiltPath = normalizePath(rebuiltDir);

    const manifest = await readManifest(normalizedOutputPath);
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

    await prepareRebuildDirectory(normalizedRebuiltPath);
    await restoreEmptyDirectories(
        normalizedRebuiltPath,
        manifest.emptyDirectories ?? [],
    );

    const fileOutcomes: SplitFileOutcome[] = [];

    for (const filename of Object.keys(manifest.files)) {
        if (hooks?.onFileStart) {
            await hooks.onFileStart(filename);
        }

        const outcome = await splitArchiveFile(
            normalizedOutputPath,
            normalizedRebuiltPath,
            filename,
        );
        fileOutcomes.push(outcome);

        if (hooks?.onFileSuccess) {
            await hooks.onFileSuccess(filename, outcome);
        }
    }

    return {
        manifestFound: true,
        fileOutcomes,
        totalFilesRecreated: fileOutcomes.reduce(filesRecreatedReducer, 0),
    };
}

/**
 * Reads the manifest and prepares the rebuild directory (wipe +
 * restore empty dirs).
 *
 * @param outputDir - Directory containing the compiled archive files
 * and manifest.
 * @param rebuiltDir - Directory to recreate original files into.
 * @returns The read manifest, or `null` if `manifest.json` wasn't found.
 */
export async function initializeSplit(
    outputDir: string,
    rebuiltDir: string,
): Promise<Manifest | null> {
    const normalizedOutputPath = normalizePath(outputDir);
    const normalizedRebuiltPath = normalizePath(rebuiltDir);

    const manifest = await readManifest(normalizedOutputPath);
    if (!manifest) return null;

    await prepareRebuildDirectory(normalizedRebuiltPath);
    await restoreEmptyDirectories(
        normalizedRebuiltPath,
        manifest.emptyDirectories ?? [],
    );

    return manifest;
}

/**
 * Splits a single job's archive. A thin wrapper around {@link
 * splitArchiveFile}.
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
    const normalizedOutputPath = normalizePath(outputDir);
    const normalizedRebuiltPath = normalizePath(rebuiltDir);

    return await splitArchiveFile(
        normalizedOutputPath,
        normalizedRebuiltPath,
        filename,
    );
}

const filesRecreatedReducer = (
    sum: number,
    outcome: SplitFileOutcome,
): number => {
    return sum + outcome.filesRecreated;
};
