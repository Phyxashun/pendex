// FILE-PATH: packages/compile/src/CompileService.ts

/**
 * @module CompileService
 *
 * Single responsibility: *do* the compile —
 *      resolve files,
 *      write archives,
 *      build the manifest
 *      hand back plain data describing what happened.
 *
 * All state changes live here, nothing renders here.
 *
 * Imports `FileScanner` (what matches) and `ArchiveFormat` (how an entry is
 * written).
 *
 * Never imports `@clack/prompts` — that import boundary is what
 * makes this file testable without mocking a terminal, and reusable if
 * Pendex ever grows a non-CLI front end.
 */

import type { Config, Job, Manifest } from '@pendex/core';
import {
    archivePathFor,
    buildArchiveEntry,
    Constants,
    findEmptyDirectories,
    joinArchiveEntries,
    joinPath,
    loadIgnorePatterns,
    resolveJobFiles,
} from '@pendex/core';
import type { BunFile } from 'bun';
import { mkdir, rm } from 'node:fs/promises';
import { ToPdf, ToPdfService } from '../../../utils/ToPdf';

/**
 * Accumulators shared across every job in a compile run, before
 * any specific job is attached.
 */
export interface CompileJobContext {
    // Application configuration.
    readonly config: Config;
    // Combined global excludes (config + .gitignore).
    readonly excludes: string[];
    // The manifest being built up across all jobs.
    readonly manifest: Manifest;
    // Paths already claimed by earlier jobs.
    readonly claimedPaths: Set<string>;
    // Compile hooks.
    readonly hooks: CompileHooks;
    // Current working directory.
    readonly cwd: string;
}

/**
 * Everything {@link compileJob} needs to resolve, archive, and write
 * one job's output.
 */
export interface CompileJob extends CompileJobContext {
    // The job to compile.
    readonly job: Job;
    // Directory the job's archive file is written into.
    readonly outputDir: string;
}

/**
 * Outcome of compiling a single job.
 */
export interface CompileJobResult {
    // The job that was compiled.
    readonly job: Job;
    // Number of files this job matched and archived.
    readonly fileCount: number;
}

/**
 * Full summary returned after a compile run completes.
 */
export interface CompileSummary {
    // Combined global excludes used for this run.
    readonly excludes: string[];
    // Per-job outcomes, in the order jobs ran.
    readonly jobOutcomes: CompileJobResult[];
    // Total files archived across every job.
    totalFiles: number;
    // Directories found with an entirely empty subtree.
    readonly emptyDirectories: string[];
}

/**
 * Optional progress callbacks a caller (e.g. the interactive CLI
 * view) can hook into a compile run.
 */
export interface CompileHooks {
    // Called once, before any job runs, with the resolved global excludes.
    onCompileStart?: (excludes: string[]) => void | Promise<void>;

    // Called before a job starts compiling.
    onJobStart?: (job: Job) => void | Promise<void>;

    // Called after a job finishes compiling successfully.
    onJobSuccess?: (
        job: Job,
        outcome: CompileJobResult,
    ) => void | Promise<void>;

    // Called once, after every job has run, with the total file count.
    onCompileSuccess?: (totalFiles: number) => void | Promise<void>;
}

/**
 * Resolves all active exclude glob patterns by merging global config defaults
 * with project-level `.gitignore` rules.
 *
 * @param config Active Pendex configuration object.
 * @param cwd Current working directory context. Defaults to process.cwd().
 * @returns A promise resolving to an array of consolidated exclude
 *  glob strings.
 */
export const resolveExcludes = async (config: Config): Promise<string[]> => {
    const excludes: string[] = [...config.exclude];
    const gitignoreFile: BunFile = Bun.file(Constants.GITIGNORE_PATH);

    // Bun's blazing fast file checking
    if (await gitignoreFile.exists()) {
        const gitignorePatterns: string[] = await loadIgnorePatterns(
            Constants.GITIGNORE_PATH,
        );
        excludes.push(...gitignorePatterns);
    }

    return excludes;
};

/**
 * Wipes and recreates the output directory.
 *
 * @param dir - Directory to wipe and recreate.
 */
export const prepareOutputDirectory = async (dir: string): Promise<void> => {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
};

/**
 * Resolves, archives, and writes one job's .txt file.
 * Mutates `manifest` and `claimedPaths` as a side effect.
 *
 * @param currentJob - The job plus the shared per-run accumulators.
 * @returns The job and how many files it archived.
 */
export const compileJob = async (
    currentJob: CompileJob,
): Promise<CompileJobResult> => {
    const {
        job,
        excludes,
        outputDir,
        manifest,
        claimedPaths,
        config,
    }: CompileJob = currentJob;

    const combinedExcludes = [
        ...new Set([...excludes, ...job.exclude]),
    ] as string[];
    const files: string[] = await resolveJobFiles(
        job,
        combinedExcludes,
        claimedPaths,
    );

    if (files.length === 0) return { job, fileCount: 0 };

    manifest.files[job.filename] = files.map(f => f.replace(/\\/g, '/'));
    manifest.categories ??= {};
    manifest.categories[job.filename] = job.category;
    files.forEach(f => claimedPaths.add(f.replace(/\\/g, '/')));

    const entries = await Promise.all(
        files.map(async filePath => {
            const content = await Bun.file(filePath).text();
            return buildArchiveEntry(filePath, content);
        }),
    );

    const txtPath = archivePathFor(outputDir, job.filename);
    const archiveContent = joinArchiveEntries(entries);

    // If PDF output type is specified in config, convert .txt to .pdf
    if (config?.outputType === 'pdf') {
        const tempTxtPath = `${txtPath}.tmp`;
        const pdfFilename: string = job.filename.replace(/\.txt$/i, '.pdf');
        const pdfPath: string = archivePathFor(outputDir, pdfFilename);

        // Write temp text archive
        await Bun.write(tempTxtPath, archiveContent);

        // Convert text archive to PDF using ToPdf utility
        const converter: ToPdfService = ToPdf.create({
            fontSize: 7,
            lineHeight: 11,
            oneLongPage: false,
            syntaxHighlighting: true,
        });
        await converter.convertToPdf(tempTxtPath, pdfPath);

        // Remove temporary text file via Bun Shell
        await Bun.$`rm -f ${tempTxtPath}`;

        // Update manifest mapping to reflect PDF archive filename
        manifest.files[pdfFilename] = manifest.files[job.filename] as string[];
        delete manifest.files[job.filename];
        manifest.categories[pdfFilename] = job.category;
        delete manifest.categories[job.filename];
    } else {
        // Default plain-text output
        await Bun.write(txtPath, archiveContent);
    }

    return {
        job,
        fileCount: files.length,
    };
};

/**
 * Writes `manifest.json` into the output directory.
 *
 * @param outputDir - Directory to write `manifest.json` into.
 * @param manifest - The manifest data to serialize.
 */
export const writeManifest = async (
    outputDir: string,
    manifest: Manifest,
): Promise<void> => {
    await Bun.write(
        joinPath(outputDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
    );
};

/**
 * Headless execution path used by standard commands and isolated testing tools.
 *
 * @param config - The active application config.
 * @param hooks - Optional progress callbacks.
 * @returns The full {@link CompileSummary} for this run.
 */
export const runCompile = async (
    config: Config,
    hooks?: CompileHooks,
): Promise<CompileSummary> => {
    await prepareOutputDirectory(config.outputDir);

    const cwd: string = Constants.BASE_DIR;
    const excludes: string[] = await resolveExcludes(config);
    const emptyDirectories: string[] = await findEmptyDirectories(
        cwd,
        excludes,
    );
    const manifest: Manifest = {
        files: {},
        emptyDirectories,
    };
    const claimedPaths: Set<string> = new Set<string>();

    const result: CompileSummary = {
        excludes,
        jobOutcomes: [],
        totalFiles: 0,
        emptyDirectories,
    };

    if (hooks?.onCompileStart) {
        await hooks.onCompileStart(excludes);
    }

    for (const job of config.jobs as Job[]) {
        if (hooks?.onJobStart) {
            await hooks.onJobStart(job);
        }

        const currentCompileJob: CompileJob = {
            config,
            job,
            excludes,
            outputDir: config.outputDir,
            manifest,
            claimedPaths,
            hooks: hooks ?? {},
            cwd,
        };

        const outcome: CompileJobResult = await compileJob(currentCompileJob);

        result.jobOutcomes.push(outcome);
        result.totalFiles += outcome.fileCount;

        if (hooks?.onJobSuccess) {
            await hooks.onJobSuccess(job, outcome);
        }
    }

    await writeManifest(config.outputDir, manifest);

    if (hooks?.onCompileSuccess) {
        await hooks.onCompileSuccess(result.totalFiles);
    }

    return result;
};

/**
 * Initializes a new compilation session, resolving global excludes
 * and preparing the manifest and claimedPaths set.
 *
 * @param config Application configuration object.
 * @param hooks Optional progress event hook callbacks.
 * @param cwd Current working directory context. Defaults to Constants.BASE_DIR.
 * @returns A promise resolving to the initialized compilation session state.
 */
export const initializeCompile = async (
    config: Config,
    hooks?: CompileHooks,
    cwd: string = Constants.BASE_DIR,
): Promise<CompileJobContext> => {
    const excludes: string[] = await resolveExcludes(config);
    const claimedPaths: Set<string> = new Set<string>();

    const manifest: Manifest = {
        files: {},
        categories: {},
        emptyDirectories: await findEmptyDirectories(cwd, excludes),
    };

    return {
        config,
        excludes,
        manifest,
        claimedPaths,
        hooks: hooks ?? {},
        cwd,
    };
};

/**
 * Compiles a single job against the shared accumulators from {@link
 * initializeCompile}.
 *
 * @param job - The job to compile.
 * @param ctx - Shared concrete config and per-run accumulators.
 * @returns The job's compile outcome.
 */
export const compileSingleJob = async (
    job: Job,
    ctx: CompileJobContext,
): Promise<CompileJobResult> => {
    return await compileJob({
        ...ctx,
        job,
        excludes: ctx.excludes,
        outputDir: ctx.config.outputDir,
        manifest: ctx.manifest,
        claimedPaths: ctx.claimedPaths,
        config: ctx.config,
    });
};

/**
 * Finishes a manually-sequenced compile run: finds empty directories
 * and writes the manifest.
 *
 * @param config - The active application config.
 * @param ctx - Shared concrete excludes and manifest accumulated
 *  during the run.
 * @returns A {@link CompileSummary} template for the caller to augment.
 */
export const finalizeCompile = async (
    config: Config,
    ctx: CompileJobContext,
): Promise<CompileSummary> => {
    ctx.manifest.emptyDirectories = await findEmptyDirectories(
        ctx.cwd,
        ctx.excludes,
    );
    await writeManifest(config.outputDir, ctx.manifest);

    return {
        excludes: ctx.excludes,
        jobOutcomes: [],
        totalFiles: 0,
        emptyDirectories: ctx.manifest.emptyDirectories,
    };
};
