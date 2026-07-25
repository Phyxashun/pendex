//
// SINGLE RESPONSIBILITY: *do* the compile — resolve files, write archives,
// build the manifest — and hand back plain data describing what happened.
// This is the "hook" layer in the React comparison: all the state changes
// live here, nothing renders here. It imports FileScanner (what matches)
// and ArchiveFormat (how an entry is written) but never '@clack/prompts' —
// that import boundary is what makes this file testable without mocking
// a terminal, and reusable if Pendex ever grows a non-CLI front end.

import { Constants, joinPath } from '@pendex/core';
import type { Config, Job, Manifest } from '@pendex/core';
import { archivePathFor, buildArchiveEntry, joinArchiveEntries } from '@pendex/core';
import { findEmptyDirectories, loadIgnorePatterns, resolveJobFiles } from '@pendex/core';

export interface InitializedCompileJob {
    readonly excludes: string[];
    readonly manifest: Manifest;
    readonly claimedPaths: Set<string>;
}

export interface CompileJob extends InitializedCompileJob {
    readonly job: Job;
    readonly outputDir: string;
}

export interface CompileJobResult {
    readonly job: Job;
    readonly fileCount: number;
}

export interface CompileSummary {
    readonly excludes: string[];
    readonly jobOutcomes: CompileJobResult[];
    readonly totalFiles: number;
    readonly emptyDirectories: string[];
}

export interface CompileHooks {
    onCompileStart?: (excludes: string[]) => void | Promise<void>;
    onJobStart?: (job: Job) => void | Promise<void>;
    onJobSuccess?: (job: Job, outcome: CompileJobResult) => void | Promise<void>;
    onCompileSuccess?: (totalFiles: number) => void | Promise<void>;
}

/** Global excludes = config.exclude ∪ .gitignore patterns, deduplicated. */
export async function resolveExcludes(config: Config): Promise<string[]> {
    const gitignorePatterns = await loadIgnorePatterns(Constants.GITIGNORE_PATH);
    return [...new Set([...config.exclude, ...gitignorePatterns])];
}

/** Wipes and recreates the output directory. */
export async function prepareOutputDirectory(dir: string): Promise<void> {
    await Bun.$`rm -rf ${dir}`;
    await Bun.$`mkdir -p ${dir}`;
}

/**
 * Resolves, archives, and writes one job's .txt file.
 * Mutates `manifest` and `claimedPaths` as a side effect (both are
 * per-run accumulators owned by the caller) and returns how many files
 * this job produced.
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

export async function initializeCompile(config: Config): Promise<InitializedCompileJob> {
    await prepareOutputDirectory(config.outputDir);
    return {
        excludes: await resolveExcludes(config),
        manifest: { files: {}, emptyDirectories: [] },
        claimedPaths: new Set<string>(),
    }
}

export async function compileSingleJob(job: Job, ctx: { config: Config, excludes: string[], manifest: Manifest, claimedPaths: Set<string> }): Promise<CompileJobResult> {
    return await compileJob({
        job,
        excludes: ctx.excludes,
        outputDir: ctx.config.outputDir,
        manifest: ctx.manifest,
        claimedPaths: ctx.claimedPaths
    });
}

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
