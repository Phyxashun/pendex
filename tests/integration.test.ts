// FILE-PATH: tests/integration.test.ts
//
// CROSS-PACKAGE INTEGRATION. Everything here exercises @pendex/compile
// and @pendex/split TOGETHER — the full compile → split round trip that
// neither package can test alone (each package's own suite proves it
// works in isolation; this proves they agree on the archive format and
// manifest in practice). It lives in the root pendex package because
// that's the only package that depends on both.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Compile } from '@pendex/compile';
import { Split, SplitView } from '@pendex/split';
import { FallbackTheme } from '@pendex/theme';
import { ConfigManager, type Config, type Manifest } from '@pendex/core';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX = './test-sandbox-integration';

describe('Compile → Split round trip (cross-package)', () => {
    let testConfig: Config;
    const originalCwd = process.cwd();

    beforeEach(async () => {
        await createSandbox(SANDBOX);
        process.chdir(SANDBOX);

        ConfigManager.resetInstance();
        const configManager = await ConfigManager.getInstance();
        testConfig = JSON.parse(JSON.stringify(configManager.get()));

        testConfig.outputDir = 'OUT';
        testConfig.rebuiltDir = 'REBUILT';
        testConfig.jobs = [{
            filename: 'code.txt', category: 'source', description: 'Source files',
            include: ['src/**/*.ts'], exclude: ['**/ignore-me.ts'],
        }];

        mkdirSync('src/utils', { recursive: true });
        // Fixtures WITH trailing newlines — verbatim round-trip must
        // preserve them byte for byte.
        writeFileSync('src/index.ts', 'console.log("hello");\n');
        writeFileSync('src/utils/helper.ts', 'export const help = () => {};\n');
        writeFileSync('src/utils/ignore-me.ts', '// excluded\n');
        mkdirSync(join('src', 'empty-dir'), { recursive: true });
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX);
        ConfigManager.resetInstance();
    });

    test('compiles and splits files with byte-perfect fidelity', async () => {
        const state = { theme: FallbackTheme, config: testConfig };
        await new Compile(state).execute();

        const manifest: Manifest = await Bun.file(join('OUT', 'manifest.json')).json();
        expect(manifest.files['code.txt']).toContain('src/index.ts');
        expect(manifest.categories?.['code.txt']).toBe('source');

        await new Split(state).execute();

        const originalIndex = await Bun.file('src/index.ts').text();
        const rebuiltIndex = await Bun.file(join('REBUILT', 'src', 'index.ts')).text();
        expect(rebuiltIndex).toBe(originalIndex);

        const originalHelper = await Bun.file('src/utils/helper.ts').text();
        const rebuiltHelper = await Bun.file(join('REBUILT', 'src/utils/helper.ts')).text();
        expect(rebuiltHelper).toBe(originalHelper);

        // Excluded file must not be rebuilt:
        expect(await Bun.file(join('REBUILT', 'src/utils/ignore-me.ts')).exists()).toBe(false);
    });

    test('SplitView performs a real split with live per-file progress', async () => {
        // Regression guard for the fake-progress bug: builds a real
        // archive via @pendex/compile, splits through @pendex/split's
        // View, verifies files land byte-perfect.
        const state = { theme: FallbackTheme, config: testConfig };
        await new Compile(state).execute();

        const view = new SplitView(state);
        await expect(view.render()).resolves.toBeUndefined();

        const rebuilt = await Bun.file(join('REBUILT', 'src', 'index.ts')).text();
        expect(rebuilt).toBe('console.log("hello");\n');
    });

    test('Split handles a missing manifest without throwing', async () => {
        const splitCmd = new Split({ theme: FallbackTheme, config: testConfig });
        await expect(splitCmd.execute()).resolves.toBeUndefined();
    });

    test('Split handles a missing archive file without throwing', async () => {
        mkdirSync('OUT', { recursive: true });
        writeFileSync('OUT/manifest.json', JSON.stringify({ files: { 'missing.txt': [] }, emptyDirectories: [] }));
        const splitCmd = new Split({ theme: FallbackTheme, config: testConfig });
        await expect(splitCmd.execute()).resolves.toBeUndefined();
    });

    test('empty directories recorded at compile are restored at split', async () => {
        const state = { theme: FallbackTheme, config: testConfig };
        await new Compile(state).execute();

        const manifest: Manifest = await Bun.file(join('OUT', 'manifest.json')).json();
        expect(manifest.emptyDirectories.map(d => d.replace(/\\/g, '/'))).toContain('src/empty-dir');

        await new Split(state).execute();

        const dirs = await Array.fromAsync(new Bun.Glob('**/').scan({ cwd: 'REBUILT', onlyFiles: false }));
        expect(dirs.map(d => d.replace(/\\/g, '/'))).toContain('src/empty-dir/');
    });
});
