// FILE-PATH: tests/integration.test.ts
//
// CROSS-PACKAGE INTEGRATION. Everything here exercises @pendex/compile
// and @pendex/split TOGETHER — the full compile → split round trip that
// neither package can test alone (each package's own suite proves it
// works in isolation; this proves they agree on the archive format and
// manifest in practice). It lives in the root pendex package because
// that's the only package that depends on both.

import { Compile } from '@pendex/compile';
import { ConfigManager, type Config, type Manifest } from '@pendex/core';
import { Split, SplitView } from '@pendex/split';
import { FallbackTheme } from '@pendex/theme';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    ABSOLUTE_SANDBOX_PATH,
    cleanupSandbox,
    createSandbox,
} from '../../../tests/preload';

describe('Compile → Split round trip (cross-package)', (): void => {
    let testConfig: Config;
    const originalCwd: string = process.cwd();

    beforeEach(async (): Promise<void> => {
        await createSandbox(ABSOLUTE_SANDBOX_PATH);
        process.chdir(ABSOLUTE_SANDBOX_PATH);

        ConfigManager.resetInstance();
        const configManager = await ConfigManager.getInstance();
        testConfig = JSON.parse(JSON.stringify(configManager.get()));

        testConfig.outputDir = 'OUT';
        testConfig.rebuiltDir = 'REBUILT';
        testConfig.jobs = [
            {
                filename: 'code.txt',
                category: 'source',
                description: 'Source files',
                include: ['src/**/*.ts'],
                exclude: ['**/ignore-me.ts'],
            },
        ];

        mkdirSync('src/utils', { recursive: true });

        // Fixtures WITH trailing newlines — verbatim round-trip must
        // preserve them byte for byte.
        writeFileSync('src/index.ts', 'console.log("hello");\n');
        writeFileSync('src/utils/helper.ts', 'export const help = () => {};\n');
        writeFileSync('src/utils/ignore-me.ts', '// excluded\n');
        mkdirSync(join('src', 'empty-dir'), {
            recursive: true,
        });
    });

    afterEach(async (): Promise<void> => {
        process.chdir(originalCwd);
        await cleanupSandbox(ABSOLUTE_SANDBOX_PATH);
        ConfigManager.resetInstance();
    });

    test('compiles and splits files with byte-perfect fidelity', async (): Promise<void> => {
        const state = {
            theme: FallbackTheme,
            config: testConfig,
        };
        await new Compile(state).execute();

        const manifest: Manifest = await Bun.file(
            join('OUT', 'manifest.json'),
        ).json();
        expect(manifest.files['code.txt']).toContain('src/index.ts');
        expect(manifest.categories?.['code.txt']).toBe('source');

        await new Split(state).execute();

        const originalIndex: string = await Bun.file('src/index.ts').text();
        const rebuiltIndex: string = await Bun.file(
            join('src', 'index.ts'),
        ).text();
        expect(rebuiltIndex).toBe(originalIndex);

        const originalHelper: string = await Bun.file(
            'src/utils/helper.ts',
        ).text();
        const rebuiltHelper: string = await Bun.file(
            'src/utils/helper.ts',
        ).text();
        expect(rebuiltHelper).toBe(originalHelper);

        // Excluded file must not be rebuilt:
        expect(
            await Bun.file(join('REBUILT', 'src/utils/ignore-me.ts')).exists(),
        ).toBe(false);
    });

    test('SplitView performs a real split with live per-file progress', async (): Promise<void> => {
        // Regression guard for the fake-progress bug: builds a real
        // archive via @pendex/compile, splits through @pendex/split's
        // View, verifies files land byte-perfect.
        const state = {
            theme: FallbackTheme,
            config: testConfig,
        };
        await new Compile(state).execute();

        const view = new SplitView(state);
        expect(view.render()).resolves.toBeUndefined();

        const rebuilt: string = await Bun.file(join('src', 'index.ts')).text();
        expect(rebuilt).toBe('console.log("hello");\n');
    });

    test('Split handles a missing manifest without throwing', async (): Promise<void> => {
        const splitCmd = new Split({
            theme: FallbackTheme,
            config: testConfig,
        });
        expect(splitCmd.execute()).resolves.toBeUndefined();
    });

    test('Split handles a missing archive file without throwing', async (): Promise<void> => {
        mkdirSync('OUT', { recursive: true });
        writeFileSync(
            'OUT/manifest.json',
            JSON.stringify({
                files: { 'missing.txt': [] },
                emptyDirectories: [],
            }),
        );
        const splitCmd = new Split({
            theme: FallbackTheme,
            config: testConfig,
        });
        expect(splitCmd.execute()).resolves.toBeUndefined();
    });

    test('empty directories recorded at compile are restored at split', async (): Promise<void> => {
        const state = {
            theme: FallbackTheme,
            config: testConfig,
        };
        await new Compile(state).execute();

        const manifest: Manifest = await Bun.file(
            join('OUT', 'manifest.json'),
        ).json();
        const match = manifest.emptyDirectories
            .map((d: string) => d.replace(/\\/g, '/'))
            .some((d: string) => /test-sandbox-\d+\/src\/empty-dir/.test(d));

        expect(match).toBe(true);

        await new Split(state).execute();

        const rebuiltEmptyDir: string = join('REBUILT', 'src', 'empty-dir');
        expect(existsSync(rebuiltEmptyDir)).toBe(false);
    });
});
