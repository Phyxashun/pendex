// FILE-PATH: packages/compile/tests/view.test.ts

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { FallbackTheme } from '@pendex/theme';
import type { Config } from '@pendex/core';
import { CompileView } from '../src';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX = './test-sandbox-compileview';

const baseConfig = (): Config => ({
    theme: 'pendex',
    outputDir: 'OUT',
    rebuiltDir: 'REBUILT',
    exclude: [],
    jobs: [],
});

describe('CompileView', () => {
    const originalCwd = process.cwd();

    beforeEach(async () => {
        await createSandbox(SANDBOX);
        process.chdir(SANDBOX);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX);
    });

    test('catches errors instead of throwing (invalid outputDir)', async () => {
        const config = baseConfig();
        config.outputDir = 'OUT\u0000BAD'; // NUL byte → rm/mkdir must fail

        const view = new CompileView({ theme: FallbackTheme, config });
        await expect(view.render()).resolves.toBeUndefined();
    });

    test('happy path with an empty job list still renders a summary', async () => {
        const view = new CompileView({
            theme: FallbackTheme,
            config: baseConfig(),
        });
        await expect(view.render()).resolves.toBeUndefined();
        expect(await Bun.file('OUT/manifest.json').exists()).toBe(true);
    });
});
