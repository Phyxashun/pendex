// FILE-PATH: packages/split/tests/split.test.ts
//

/**
 * @file packages/split/tests/split.test.ts
 * @description Unit test suite for `Split.ts`. Scoped strictly to packages/split/tests/.
 */

import { resolveRunnerDeps, type State } from '@pendex/core';
import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { join } from 'node:path';
import { Split } from '../src/Split';
import { SplitView } from '../src/SplitView';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);

const ORIGINAL_CWD: string = process.cwd();
let state: State;

describe('Split Command (Split.ts)', (): void => {
    beforeAll(async (): Promise<void> => {
        state = await resolveRunnerDeps();
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
    });

    afterAll(async (): Promise<void> => {
        process.chdir(ORIGINAL_CWD);
        await cleanupSandbox(SANDBOX_DIR);
    });

    // ==========================================
    // ⚙️ Instantiation & Metadata Properties
    // ==========================================

    test('should correctly instantiate and set key, label, and hint properties', (): void => {
        const splitCommand = new Split(state);

        expect(splitCommand.key).toBe('split');
        expect(splitCommand.label).toBeDefined();
        expect(splitCommand.hint).toBeDefined();

        expect(splitCommand.label).toContain('Split Archive');
        expect(splitCommand.hint).toContain('Rebuild project files');
    });

    // ==========================================
    // 🚀 Execute Method & View Delegation
    // ==========================================

    test('should delegate execution directly to SplitView.render()', async (): Promise<void> => {
        const splitCommand = new Split(state);

        const viewInstance = (splitCommand as unknown as { view: SplitView })
            .view;
        const renderSpy = spyOn(viewInstance, 'render').mockResolvedValue(
            undefined,
        );

        await splitCommand.execute();

        expect(renderSpy).toHaveBeenCalledTimes(1);
    });
});
