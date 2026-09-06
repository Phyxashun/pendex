// FILE-PATH: packages/compile/tests/compile.test.ts
//
/**
 * @file packages/compile/tests/compile.test.ts
 * @description Unit test suite for `Compile.ts`. Scoped strictly to packages/compile/tests/.
 */

import { resolveRunnerDeps, type State } from '@pendex/core';
import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { join } from 'node:path';
import { Compile } from '../src/Compile';
import { CompileView } from '../src/CompileView';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);

const ORIGINAL_CWD: string = process.cwd();
let state: State;

describe('Compile Command (Compile.ts)', (): void => {
    beforeAll(async (): Promise<void> => {
        state = await resolveRunnerDeps();
        // Create sandbox ONCE per file suite
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
    });

    afterAll(async (): Promise<void> => {
        // Tear down sandbox ONCE after all tests in this file complete
        process.chdir(ORIGINAL_CWD);
        await cleanupSandbox(SANDBOX_DIR);
    });

    // ==========================================
    // ⚙️ Instantiation & Metadata Properties
    // ==========================================

    test('should correctly instantiate and set key, label, and hint properties', (): void => {
        const compileCommand = new Compile(state);

        expect(compileCommand.key).toBe('compile');
        expect(compileCommand.label).toBeDefined();
        expect(compileCommand.hint).toBeDefined();

        expect(compileCommand.label).toContain('Compile project');
        expect(compileCommand.hint).toContain('Consolidates project files');
    });

    // ==========================================
    // 🚀 Execute Method & View Delegation
    // ==========================================

    test('should delegate execution directly to CompileView.render()', async (): Promise<void> => {
        const compileCommand = new Compile(state);

        const viewInstance = (
            compileCommand as unknown as { view: CompileView }
        ).view;
        const renderSpy = spyOn(viewInstance, 'render').mockResolvedValue(
            undefined,
        );

        await compileCommand.execute();

        expect(renderSpy).toHaveBeenCalledTimes(1);
    });
});
