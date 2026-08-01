// FILE-PATH: packages/split/tests/view.test.ts

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { FallbackTheme } from '@pendex/theme';
import type { Config } from '@pendex/core';
import { SplitView } from '../src';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX = './test-sandbox-splitview';

const baseConfig = (): Config => ({
    theme: 'pendex',
    outputDir: 'OUT',
    rebuiltDir: 'REBUILT',
    exclude: [],
    jobs: [],
});

describe('SplitView', () => {
    const originalCwd = process.cwd();

    beforeEach(async () => {
        await createSandbox(SANDBOX);
        process.chdir(SANDBOX);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX);
    });

    test('catches errors instead of throwing (invalid empty-dir name in manifest)', async () => {
        mkdirSync('OUT', { recursive: true });
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
        await expect(view.render()).resolves.toBeUndefined();
    });

    test('reports missing manifest without throwing', async () => {
        const view = new SplitView({
            theme: FallbackTheme,
            config: baseConfig(),
        });
        await expect(view.render()).resolves.toBeUndefined();
    });
});
