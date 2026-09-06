// FILE-PATH: packages/split/tests/view.test.ts
//

/**
 * @file packages/split/tests/view.test.ts
 * @description Unit tests for `@pendex/split` SplitView rendering
pipeline, task building,
 * category formatting, and error boundary handling. Scoped strictly
to packages/split/tests/.
 */

import type { Config, Manifest, State } from '@pendex/core';
import {
    buildArchiveEntry,
    joinArchiveEntries,
    resolveRunnerDeps,
} from '@pendex/core';
import { FallbackTheme } from '@pendex/theme';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    spyOn,
    test,
} from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SplitView } from '../src';
import * as SplitServiceModule from '../src/SplitService';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);

const ORIGINAL_CWD: string = process.cwd();

let state: State;
let baseConfig: () => Config;

beforeAll(async (): Promise<void> => {
    state = await resolveRunnerDeps();
    baseConfig = (): Config => ({
        theme: state.config.theme,
        outputDir: 'OUT',
        rebuiltDir: 'REBUILT',
        exclude: ['OUT/**', 'REBUILT/**'],
        jobs: [],
    });

    await createSandbox(SANDBOX_DIR);
    process.chdir(SANDBOX_DIR);
});

afterAll(async (): Promise<void> => {
    process.chdir(ORIGINAL_CWD);
    await cleanupSandbox(SANDBOX_DIR);
});

describe('SplitView', (): void => {
    beforeEach((): void => {
        mkdirSync('OUT', { recursive: true });

        const archive = joinArchiveEntries([
            buildArchiveEntry('src/b.ts', 'export const b = 2;\n'),
        ]);
        writeFileSync(join('OUT', 'code.txt'), archive);
        writeFileSync(
            join('OUT', 'manifest.json'),
            JSON.stringify({
                files: {
                    'code.txt': ['src/b.ts'],
                    'missing.txt': ['src/missing.ts'],
                },
                categories: { 'code.txt': 'source' },
                emptyDirectories: [],
            }),
        );
    });

    // ==========================================
    // ⚙️ Error Boundaries & Manifest Checks
    // ==========================================

    test('catches errors instead of throwing (invalid empty-dir name in manifest)', async (): Promise<void> => {
        writeFileSync(
            'OUT/manifest.json',
            JSON.stringify({
                files: {},
                emptyDirectories: ['bad\u0000dir'],
            }),
        );

        const view = new SplitView({
            theme: FallbackTheme,
            config: baseConfig(),
        });

        expect(view.render()).resolves.toBeUndefined();
    });

    test('reports missing manifest without throwing', async (): Promise<void> => {
        const config = baseConfig();
        config.outputDir = 'NON_EXISTENT';

        const view = new SplitView({
            theme: FallbackTheme,
            config,
        });

        expect(view.render()).resolves.toBeUndefined();
    });

    test('catches non-Error exceptions in catch block', async (): Promise<void> => {
        const initSpy = spyOn(
            SplitServiceModule,
            'initializeSplit',
        ).mockImplementation(() => {
            throw 'String error thrown';
        });

        const view = new SplitView({
            theme: FallbackTheme,
            config: baseConfig(),
        });

        expect(view.render()).resolves.toBeUndefined();
        initSpy.mockRestore();
    });

    // ==========================================
    // 🚀 Happy Path Rendering
    // ==========================================

    test('renders a complete split session successfully', async (): Promise<void> => {
        const view = new SplitView({
            theme: FallbackTheme,
            config: baseConfig(),
        });

        expect(view.render()).resolves.toBeUndefined();
        expect(await Bun.file('REBUILT/src/b.ts').exists()).toBe(true);
    });

    // ==========================================
    // 🧪 Direct Task Building & Callback Execution
    // ==========================================

    test('builds and executes file tasks directly, handling missing source archives and formatters', async (): Promise<void> => {
        const view = new SplitView({
            theme: FallbackTheme,
            config: baseConfig(),
        });

        const manifest: Manifest = {
            files: {
                'code.txt': ['src/b.ts'],
                'missing.txt': ['src/missing.ts'],
            },
            categories: { 'code.txt': 'source' },
            emptyDirectories: [],
        };

        const outcomes: number[] = [];

        const viewInternal = view as unknown as {
            buildFileTask: (
                filename: string,
                index: number,
                manifest: Manifest,
                outcomes: number[],
            ) => { title: string; task: () => Promise<unknown> };
            mutedFormatter: (text: string) => string;
        };

        // Task 1: Existing Archive ('code.txt')
        const task1 = viewInternal.buildFileTask(
            'code.txt',
            0,
            manifest,
            outcomes,
        );
        expect(task1.title).toContain('code.txt');
        const res1 = await task1.task();
        expect(res1).toBeDefined();
        expect(outcomes[0]).toBe(1);

        // Task 2: Missing Archive ('missing.txt')
        const task2 = viewInternal.buildFileTask(
            'missing.txt',
            1,
            manifest,
            outcomes,
        );
        expect(task2.title).toContain('missing.txt');
        const res2 = await task2.task();
        expect(res2).toBeDefined();
        expect(outcomes[1]).toBe(0);

        expect(viewInternal.mutedFormatter('test')).toBeDefined();
    });
});
