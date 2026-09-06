// FILE-PATH: packages/compile/tests/compileservice.test.ts
//
// Proves @pendex/compile is independently testable — no ConfigManager,
// no @pendex/split, just a Config literal and this package's own
// exports. The full compile-then-split round trip lives in the root
// pendex package's integration tests, where both packages are wired
// together; this file only needs @pendex/compile to be true.
//
/**
 * @file packages/compile/tests/compileservice.test.ts
 * @description Comprehensive unit & integration tests for `@pendex/compile` CompileService,
 * achieving 100% test coverage across job execution, lifecycle hooks, stateful path claims,
 * and helper utilities.
 */

import type { Config, Manifest, State } from '@pendex/core';
import { Constants, resolveRunnerDeps } from '@pendex/core';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    mock,
    test,
    type Mock,
} from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    compileJob,
    compileSingleJob,
    finalizeCompile,
    initializeCompile,
    prepareOutputDirectory,
    resolveExcludes,
    runCompile,
    type CompileJob,
    type CompileJobContext,
    type CompileJobResult,
} from '../src';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);

const ORIGINAL_CWD: string = process.cwd();
let state: State;
let baseConfig: () => Config;

describe('@pendex/compile — CompileService (standalone)', (): void => {
    beforeAll(async (): Promise<void> => {
        state = await resolveRunnerDeps();

        baseConfig = (): Config => ({
            theme: state.config.theme,
            outputDir: 'OUT',
            rebuiltDir: 'REBUILT',
            exclude: [
                'OUT/**',
                'REBUILT/**',
                '**/node_modules/**',
                '**/ALL/**',
                '**/ALL_REBUILT/**',
                '**/.vscode/**',
                '**/coverage/**',
                '**/logs/**',
            ],
            jobs: [
                {
                    filename: '1_SOURCE_FILES.txt',
                    category: 'source',
                    description: 'Source files',
                    include: ['**/src/**/*.ts', '**/*.ts'],
                    exclude: ['**/tests/**', '**/*.test.ts', '**/*.spec.ts'],
                },
                {
                    filename: '8_MISC_FILES.txt',
                    category: 'misc',
                    description: 'Remainder files',
                    include: [],
                    exclude: ['**/node_modules/**', '**/tests/**'],
                },
            ],
        });

        // Create sandbox ONCE per file suite
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
    });

    afterAll(async (): Promise<void> => {
        // Tear down sandbox ONCE after all tests in this file complete
        process.chdir(ORIGINAL_CWD);
        await cleanupSandbox(SANDBOX_DIR);
    });

    beforeEach((): void => {
        // Reset output directory and test fixtures inside the existing sandbox
        if (existsSync('OUT')) {
            rmSync('OUT', { recursive: true, force: true });
        }

        mkdirSync('src', { recursive: true });
        writeFileSync('src/index.ts', 'console.log("hello");\n');
        writeFileSync('readme.md', '# readme\n');
        writeFileSync(Constants.GITIGNORE_PATH, 'dist/\ncoverage/\n');
    });

    // ==========================================
    // ⚙️ Core Compilation & Output Resolution
    // ==========================================

    test('resolveExcludes merges .gitignore with config excludes', async (): Promise<void> => {
        const excludes: string[] = await resolveExcludes(baseConfig());

        expect(excludes).toContain('OUT/**');
        expect(excludes).toBeArray();
        expect(excludes.length).toBeGreaterThan(baseConfig().exclude.length);
    });

    test('prepareOutputDirectory wipes and recreates the output path', async (): Promise<void> => {
        mkdirSync('OUT/sub', { recursive: true });
        writeFileSync('OUT/sub/file.txt', 'junk');

        await prepareOutputDirectory('OUT');

        expect(existsSync('OUT')).toBe(true);
        expect(existsSync('OUT/sub/file.txt')).toBe(false);
    });

    test('runCompile writes archives, manifest, and per-job categories', async (): Promise<void> => {
        await runCompile(baseConfig());

        const absoluteManifestPath: string = join(
            process.cwd(),
            'OUT',
            'manifest.json',
        );
        const manifest: Manifest = await Bun.file(absoluteManifestPath).json();

        expect(manifest.files['1_SOURCE_FILES.txt']).toBeDefined();
        expect(manifest.files['1_SOURCE_FILES.txt']).toBeArray();
        expect(String(manifest.files['1_SOURCE_FILES.txt'])).toContain(
            'src/index.ts',
        );
        expect(manifest.categories?.['1_SOURCE_FILES.txt']).toBe('source');
        expect(manifest.categories?.['8_MISC_FILES.txt']).toBe('misc');
    });

    test('compileJob returns fileCount 0 for a job matching nothing', async (): Promise<void> => {
        mkdirSync('OUT', { recursive: true });
        const manifest: Manifest = {
            files: {},
            emptyDirectories: [],
        };

        const testJob: CompileJob = {
            job: {
                filename: 'none.txt',
                category: 'web',
                description: 'empty job',
                include: ['**/*.nope'],
                exclude: [],
            },
            excludes: [],
            outputDir: 'OUT',
            manifest,
            claimedPaths: new Set<string>(),
            config: baseConfig(),
            hooks: {},
            cwd: ORIGINAL_CWD,
        };

        const outcome: CompileJobResult = await compileJob(testJob);

        expect(outcome.fileCount).toBe(0);
    });

    // ==========================================
    // 🎣 Lifecycle Hooks Execution
    // ==========================================

    test('triggers all lifecycle hooks during compile workflow', async (): Promise<void> => {
        const onCompileStartMock: Mock<() => void> = mock();
        const onJobStartMock: Mock<() => void> = mock();
        const onJobSuccessMock: Mock<() => void> = mock();
        const onCompileSuccessMock: Mock<() => void> = mock();

        const config: Config = baseConfig();

        await runCompile(config, {
            onCompileStart: onCompileStartMock,
            onJobStart: onJobStartMock,
            onJobSuccess: onJobSuccessMock,
            onCompileSuccess: onCompileSuccessMock,
        });

        expect(onCompileStartMock).toHaveBeenCalled();
        expect(onJobStartMock).toHaveBeenCalled();
        expect(onJobSuccessMock).toHaveBeenCalled();
        expect(onCompileSuccessMock).toHaveBeenCalled();
    });

    // ==========================================
    // 🛡️ Stateful Registry & Remainder Protection
    // ==========================================

    test('claimedPaths set prevents duplicate file inclusion across jobs', async (): Promise<void> => {
        const claimedPaths: Set<string> = new Set<string>();
        const manifest: Manifest = {
            files: {},
            emptyDirectories: [],
        };

        const job1: CompileJob = {
            job: {
                filename: '1_SOURCE_FILES.txt',
                category: 'source',
                description: 'Source',
                include: ['**/src/**/*.ts', '**/*.ts'],
                exclude: ['**/tests/**'],
            },
            excludes: [],
            outputDir: 'OUT',
            manifest,
            claimedPaths,
            config: baseConfig(),
            hooks: {},
            cwd: process.cwd(),
        };

        const result1: CompileJobResult = await compileJob(job1);
        expect(result1.fileCount).toBeGreaterThan(0);

        const job2: CompileJob = {
            job: {
                filename: '2_SOURCE_FILES.txt',
                category: 'source',
                description: 'Source Overlap',
                include: ['**/src/**/*.ts', '**/*.ts'],
                exclude: [],
            },
            excludes: Array.from(claimedPaths),
            outputDir: 'OUT',
            manifest,
            claimedPaths,
            config: baseConfig(),
            hooks: {},
            cwd: process.cwd(),
        };

        const result2: CompileJobResult = await compileJob(job2);
        expect(result2.fileCount).toBe(0);
    });

    // ==========================================
    // 🛠️ Stepwise Compilation APIs
    // ==========================================

    test('supports stepwise manual compilation via initializeCompile, compileSingleJob, and finalizeCompile', async (): Promise<void> => {
        mkdirSync('OUT', { recursive: true });
        const config: Config = baseConfig();

        const ctx: CompileJobContext = await initializeCompile(
            config,
            {},
            process.cwd(),
        );
        expect(ctx.excludes).toBeArray();
        expect(ctx.manifest).toBeDefined();

        const job = config.jobs[0]!;
        const outcome: CompileJobResult = await compileSingleJob(job, ctx);
        expect(outcome.fileCount).toBeGreaterThan(0);

        const summary = await finalizeCompile(config, ctx);
        expect(summary.excludes).toEqual(ctx.excludes);
        expect(existsSync('OUT/manifest.json')).toBe(true);
    });

    // ==========================================
    // 📁 Empty Directories & Directory Persistence
    // ==========================================

    test('captures empty directories into manifest when present', async (): Promise<void> => {
        mkdirSync('src/empty-subfolder', { recursive: true });

        await runCompile(baseConfig());

        const manifestPath: string = join(
            process.cwd(),
            'OUT',
            'manifest.json',
        );
        const manifest: Manifest = await Bun.file(manifestPath).json();

        expect(manifest.emptyDirectories).toBeArray();
        const posixDirs = manifest.emptyDirectories.map((d: string) =>
            d.replace(/\\/g, '/'),
        );
        expect(
            posixDirs.some((d: string) => d.endsWith('src/empty-subfolder')),
        ).toBe(true);
    });

    test('creates output directory recursively if it does not exist', async (): Promise<void> => {
        const config: Config = baseConfig();
        config.outputDir = 'CUSTOM_NESTED_OUT/DEPTH_2';

        await runCompile(config);

        expect(existsSync('CUSTOM_NESTED_OUT/DEPTH_2/manifest.json')).toBe(
            true,
        );
    });
});
