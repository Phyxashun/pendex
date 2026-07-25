//
// SINGLE RESPONSIBILITY: *do* the split — read the manifest, parse each
// archive, rewrite the original files — and hand back plain data. Same
// "hook" role as CompileService: depends on ArchiveFormat for parsing,
// never imports '@clack/prompts'.

import { dirName, joinPath } from '@pendex/core';
import type { Manifest } from '@pendex/core';
import { archivePathFor, parseArchive } from '@pendex/core';

export interface SplitFileOutcome {
    readonly filename: string;
    readonly archiveFound: boolean;
    readonly filesRecreated: number;
}

export interface SplitSummary {
    readonly manifestFound: boolean;
    readonly fileOutcomes: SplitFileOutcome[];
    readonly totalFilesRecreated: number;
}

export interface SplitHooks {
    onSplitStart?: (manifest: Manifest) => void | Promise<void>;
    onFileStart?: (filename: string) => void | Promise<void>;
    onFileSuccess?: (filename: string, outcome: SplitFileOutcome) => void | Promise<void>;
}

/** Reads and parses manifest.json from an output directory, or null if it doesn't exist. */
export async function readManifest(outputDir: string): Promise<Manifest | null> {
    const manifestFile = Bun.file(joinPath(outputDir, 'manifest.json'));
    if (!(await manifestFile.exists())) return null;
    return manifestFile.json() as Promise<Manifest>;
}

/** Wipes the rebuild directory. */
export async function prepareRebuildDirectory(dir: string): Promise<void> {
    await Bun.$`rm -rf ${dir}`;
}

/** Recreates every empty directory recorded in the manifest. */
export async function restoreEmptyDirectories(rebuiltDir: string, emptyDirectories: string[]): Promise<void> {
    await Promise.all(
        emptyDirectories.map(dir => Bun.$`mkdir -p ${joinPath(rebuiltDir, dir)}`)
    );
}

/**
 * Splits one job's archive back into real files under `rebuiltDir`.
 * A missing source .txt is not an error — it just means nothing to
 * recreate for that job. Corrupt or unterminated entries inside the
 * archive are simply absent from parseArchive()'s results, so they're
 * skipped without failing the rest of the job.
 */
export async function splitArchiveFile(outputDir: string, rebuiltDir: string, filename: string): Promise<SplitFileOutcome> {
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
 */
export async function runSplit(
    outputDir: string,
    rebuiltDir: string,
    hooks?: SplitHooks
): Promise<SplitSummary> {
    const manifest = await readManifest(outputDir);
    if (!manifest) {
        return { manifestFound: false, fileOutcomes: [], totalFilesRecreated: 0 };
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
        totalFilesRecreated: fileOutcomes.reduce((sum, o) => sum + o.filesRecreated, 0),
    };
}

export async function initializeSplit(outputDir: string, rebuiltDir: string): Promise<{ manifest: Manifest } | null> {
    const manifest = await readManifest(outputDir);
    if (!manifest) return null;

    await prepareRebuildDirectory(rebuiltDir);
    await restoreEmptyDirectories(rebuiltDir, manifest.emptyDirectories ?? []);

    return { manifest };
}

export async function splitSingleFile(outputDir: string, rebuiltDir: string, filename: string): Promise<SplitFileOutcome> {
    return await splitArchiveFile(outputDir, rebuiltDir, filename);
}
