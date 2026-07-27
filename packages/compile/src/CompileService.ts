/**
 * @module CompileService
 *
 * Single responsibility: *do* the compile — resolve files, write
 * archives, build the manifest — and hand back plain data describing
 * what happened. This is the "hook" layer in the React comparison: all
 * the state changes live here, nothing renders here. It imports
 * `FileScanner` (what matches) and `ArchiveFormat` (how an entry is
 * written) but never `@clack/prompts` — that import boundary is what
 * makes this file testable without mocking a terminal, and reusable if
 * Pendex ever grows a non-CLI front end.
 */

import { Constants, joinPath } from '@pendex/core';
import type { Config, Job, Manifest } from '@pendex/core';
import { archivePathFor, buildArchiveEntry, joinArchiveEntries } from '@pendex/core';
import { findEmptyDirectories, loadIgnorePatterns, resolveJobFiles } from '@pendex/core';

/** Per-run accumulators shared across every job in a compile run, before any specific job is attached. */
export interface InitializedCompileJob {
    /** Combined global excludes (config + .gitignore), deduplicated. */
    readonly excludes: string[];
    /** The manifest being built up across all jobs. */
    readonly manifest: Manifest;
    /** Paths already claimed by earlier jobs. */
    readonly claimedPaths: Set<string>;
}

/** Everything {@link compileJob} needs to resolve, archive, and write one job's output. */
export interface CompileJob extends InitializedCompileJob {
    /** The job to compile. */
    readonly job: Job;
    /** Directory the job's archive file is written into. */
    readonly outputDir: string;
}

/** Outcome of compiling a single job. */
export interface CompileJobResult {
    /** The job that was compiled. */
    readonly job: Job;
    /** Number of files this job matched and archived. */
    readonly fileCount: number;
}

/** Full summary returned after a compile run completes. */
export interface CompileSummary {
    /** Combined global excludes used for this run. */
    readonly excludes: string[];
    /** Per-job outcomes, in the order jobs ran. */
    readonly jobOutcomes: CompileJobResult[];
    /** Total files archived across every job. */
    readonly totalFiles: number;
    /** Directories found with an entirely empty subtree. */
    readonly emptyDirectories: string[];
}

/** Optional progress callbacks a caller (e.g. the interactive CLI view) can hook into a compile run. */
export interface CompileHooks {
    /** Called once, before any job runs, with the resolved global excludes. */
    onCompileStart?: (excludes: string[]) => void | Promise<void>;
    /** Called before a job starts compiling. */
    onJobStart?: (job: Job) => void | Promise<void>;
    /** Called after a job finishes compiling successfully. */
    onJobSuccess?: (job: Job, outcome: CompileJobResult) => void | Promise<void>;
    /** Called once, after every job has run, with the total file count. */
    onCompileSuccess?: (totalFiles: number) => void | Promise<void>;
}

/**
 * Global excludes = config.exclude ∪ .gitignore patterns, deduplicated.
 *
 * @param config - The active application config.
 * @returns The deduplicated, combined exclude patterns.
 */
export async function resolveExcludes(config: Config): Promise<string[]> {
    const gitignorePatterns = await loadIgnorePatterns(Constants.GITIGNORE_PATH);
    return [...new Set([...config.exclude, ...gitignorePatterns])];
}

/**
 * Wipes and recreates the output directory.
 *
 * @param dir - Directory to wipe and recreate.
 */
export async function prepareOutputDirectory(dir: string): Promise<void> {
    await Bun.$`rm -rf ${dir}`;
    await Bun.$`mkdir -p ${dir}`;
}

/**
 * Resolves, archives, and writes one job's .txt file.
 * Mutates `manifest` and `claimedPaths` as a side effect (both are
 * per-run accumulators owned by the caller) and returns how many files
 * this job produced.
 *
 * @param jobToDo - The job plus the shared per-run accumulators (excludes, output dir, manifest, claimed paths).
 * @returns The job and how many files it archived.
 */
export async function compileJob(jobToDo: CompileJob): Promise<CompileJobResult> {
    const { job, excludes, outputDir, manifest, claimedPaths } = jobToDo;

    const combinedExcludes = [...new Set([...excludes, ...job.exclude])];
    const files = await resolveJobFiles(job, combinedExcludes, claimedPaths);

    if (files.length === 0) return { job: job, fileCount: 0 };

    manifest.files[job.filename] = files.map(f => f.replace(/\\/g, '/'));
    manifest.categories ??= {};
    manifest.categories[job.filename] = job.category;
    files.forEach(f => claimedPaths.add(f.replace(/\\/g, '/')));

    const entries = await Promise.all(files.map(async (filePath) => {
        const content = await Bun.file(filePath).text();
        return buildArchiveEntry(filePath, content);
    }));

    await Bun.write(archivePathFor(outputDir, job.filename), joinArchiveEntries(entries));

    return {
        job,
        fileCount: files.length
    };
}

/**
 * Writes `manifest.json` into the output directory.
 *
 * @param outputDir - Directory to write `manifest.json` into.
 * @param manifest - The manifest data to serialize.
 */
export async function writeManifest(outputDir: string, manifest: Manifest): Promise<void> {
    await Bun.write(
        joinPath(outputDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
}

/**
 * Runs every job in `config.jobs`, in order, against a freshly-prepared
 * output directory, and returns a full summary. This is the *headless*
 * entry point — no progress reporting, just run-to-completion — used by
 * the standalone `import.meta.main` block in commands/Compile.ts and by
 * tests. The interactive CLI path (views/CompileView.ts) calls the same
 * building blocks above directly instead, so it can render per-job
 * progress with @clack/prompts as each one finishes — both paths share
 * identical logic, they just sequence it differently.
 *
 * Jobs run sequentially (not Promise.all) because remainder jobs (see
 * FileScanner.resolveJobFiles) depend on `claimedPaths` reflecting every
 * job that ran before them.
 *
 * @param config - The active application config.
 * @param hooks - Optional progress callbacks.
 * @returns The full {@link CompileSummary} for this run.
 */
export async function runCompile(config: Config, hooks?: CompileHooks): Promise<CompileSummary> {
    const excludes = await resolveExcludes(config);

    // Root Milestone Hook
    if (hooks?.onCompileStart) {
        await hooks.onCompileStart(excludes);
    }

    await prepareOutputDirectory(config.outputDir);

    const manifest: Manifest = { files: {}, emptyDirectories: [] };
    const claimedPaths = new Set<string>();
    const jobOutcomes: CompileJobResult[] = [];
    let totalFiles = 0;

    for (const job of config.jobs) {
        if (hooks?.onJobStart) {
            await hooks.onJobStart(job);
        }

        const outcome = await compileJob({
            job,
            excludes,
            outputDir: config.outputDir,
            manifest,
            claimedPaths
        });

        jobOutcomes.push(outcome);
        totalFiles += outcome.fileCount;

        if (hooks?.onJobSuccess) {
            await hooks.onJobSuccess(job, outcome);
        }
    }

    manifest.emptyDirectories = await findEmptyDirectories('.', excludes);
    await writeManifest(config.outputDir, manifest);

    // Completion Summary Hook
    if (hooks?.onCompileSuccess) {
        await hooks.onCompileSuccess(totalFiles);
    }

    return {
        excludes,
        jobOutcomes,
        totalFiles,
        emptyDirectories: manifest.emptyDirectories,
    };
}

/**
 * Prepares the output directory and initializes the per-run accumulators
 * (excludes, empty manifest, claimed paths) for a manually-sequenced
 * compile — used by callers (e.g. the interactive view) that want to
 * run jobs one at a time via {@link compileSingleJob} rather than all
 * at once via {@link runCompile}.
 *
 * @param config - The active application config.
 * @returns The initialized accumulators, ready to pass to {@link compileSingleJob}.
 */
export async function initializeCompile(config: Config): Promise<InitializedCompileJob> {
    await prepareOutputDirectory(config.outputDir);
    return {
        excludes: await resolveExcludes(config),
        manifest: { files: {}, emptyDirectories: [] },
        claimedPaths: new Set<string>(),
    }
}

/**
 * Compiles a single job against the shared accumulators from
 * {@link initializeCompile}. A thin wrapper around {@link compileJob}
 * for callers that don't already have a full {@link CompileJob}.
 *
 * @param job - The job to compile.
 * @param ctx - Shared config and per-run accumulators.
 * @returns The job's compile outcome.
 */
export async function compileSingleJob(job: Job, ctx: { config: Config, excludes: string[], manifest: Manifest, claimedPaths: Set<string> }): Promise<CompileJobResult> {
    return await compileJob({
        job,
        excludes: ctx.excludes,
        outputDir: ctx.config.outputDir,
        manifest: ctx.manifest,
        claimedPaths: ctx.claimedPaths
    });
}

/**
 * Finishes a manually-sequenced compile run: finds empty directories and
 * writes the manifest. `totalFiles` and `jobOutcomes` are left for the
 * caller to fill in since this function doesn't track them itself.
 *
 * @param config - The active application config.
 * @param ctx - Shared excludes and manifest accumulated during the run.
 * @returns A {@link CompileSummary} with `totalFiles: 0` and `jobOutcomes: []` — the caller computes these.
 */
export async function finalizeCompile(config: Config, ctx: { excludes: string[], manifest: Manifest }): Promise<CompileSummary> {
    ctx.manifest.emptyDirectories = await findEmptyDirectories('.', ctx.excludes);
    await writeManifest(config.outputDir, ctx.manifest);
    return {
        excludes: ctx.excludes,
        emptyDirectories: ctx.manifest.emptyDirectories,
        totalFiles: 0, // Calculated dynamically by the caller
        jobOutcomes: []
    };
}
