// FILE-PATH: packages/compile/tests/view.test.ts
//
/**
 * @file packages/compile/tests/view.test.ts
 * @description Unit tests for `@pendex/compile` CompileView rendering pipeline, task building,
 * category formatting, and error boundary handling. Scoped strictly to packages/compile/tests/.
 */

import type { Config, State, View } from '@pendex/core';
import { resolveRunnerDeps } from '@pendex/core';
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
import { CompileView } from '../src';
import * as CompileServiceModule from '../src/CompileService';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);

const ORIGINAL_CWD: string = process.cwd();

let state: State;
let baseConfig: () => Config;

describe('CompileView', (): void => {
    beforeAll(async (): Promise<void> => {
        state = await resolveRunnerDeps();
        baseConfig = (): Config => ({
            theme: state.config.theme,
            outputDir: 'OUT',
            rebuiltDir: 'REBUILT',
            exclude: [],
            jobs: [
                {
                    filename: '1_SOURCE_FILES.txt',
                    category: 'source',
                    description: 'Source files',
                    include: ['src/**/*.ts'],
                    exclude: [],
                },
                {
                    filename: '8_MISC_FILES.txt',
                    category: 'misc',
                    description: '',
                    include: [],
                    exclude: [],
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
        mkdirSync('src', { recursive: true });
        writeFileSync('src/index.ts', 'console.log("hello");\n');
    });

    // ==========================================
    // ⚙️ Error Boundary Tests
    // ==========================================

    test('catches errors instead of throwing (invalid outputDir)', async (): Promise<void> => {
        const config: Config = baseConfig();
        config.outputDir = 'OUT\u0000BAD';

        const view = new CompileView({
            theme: FallbackTheme,
            config,
        });

        expect(view.render()).resolves.toBeUndefined();
    });

    test('catches non-Error exceptions in catch block', async (): Promise<void> => {
        const config: Config = baseConfig();
        const initSpy = spyOn(
            CompileServiceModule,
            'initializeCompile',
        ).mockImplementation(() => {
            throw 'String error thrown';
        });

        const view = new CompileView({
            theme: FallbackTheme,
            config,
        });

        expect(view.render()).resolves.toBeUndefined();
        initSpy.mockRestore();
    });

    // ==========================================
    // 🚀 Happy Path Rendering & Task Execution
    // ==========================================

    test('renders a complete compile session with jobs and task execution', async (): Promise<void> => {
        const config: Config = baseConfig();

        const view: View = new CompileView({
            theme: FallbackTheme,
            config,
        });

        expect(view.render()).resolves.toBeUndefined();
        expect(await Bun.file('OUT/manifest.json').exists()).toBe(true);
    });

    // ==========================================
    // 🧪 Direct Task Building & Callback Execution
    // ==========================================

    test('builds and executes job tasks directly, updating totalFiles and formatters', async (): Promise<void> => {
        const config: Config = baseConfig();
        const view = new CompileView({
            theme: FallbackTheme,
            config,
        });

        const ctx = await CompileServiceModule.initializeCompile(config);

        const viewInternal = view as unknown as {
            buildJobTasks: (
                ctx: CompileServiceModule.CompileJobContext,
            ) => Promise<Array<{ title: string; task: () => Promise<string> }>>;
            renderSummary: (fileCount: number) => void;
            directoryFormatter: (text: string) => string;
            numberFormatter: (num: number) => string;
            mutedFormatter: (text: string) => string;
            successFormatter: (text: string) => string;
        };

        const tasksList = await viewInternal.buildJobTasks(ctx);

        expect(tasksList).toBeArray();
        expect(tasksList.length).toBe(2);

        expect(tasksList[0]!.title).toContain('Source files');
        const task1Result = await tasksList[0]!.task();
        expect(typeof task1Result).toBe('string');

        expect(tasksList[1]!.title).toContain('8_MISC_FILES.txt');
        const task2Result = await tasksList[1]!.task();
        expect(typeof task2Result).toBe('string');

        viewInternal.renderSummary(10);
        expect(viewInternal.directoryFormatter('OUT')).toContain('OUT');
        expect(viewInternal.numberFormatter(42)).toContain('42');
        expect(viewInternal.mutedFormatter('test')).toBeDefined();
        expect(viewInternal.successFormatter('test')).toBeDefined();
    });
});
