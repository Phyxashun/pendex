// FILE-PATH: packages/compile/tests/compileservice.test.ts
//
// Proves @pendex/compile is independently testable — no ConfigManager,
// no @pendex/split, just a Config literal and this package's own
// exports. The full compile-then-split round trip lives in the root
// pendex package's integration tests, where both packages are wired
// together; this file only needs @pendex/compile to be true.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, Manifest } from '@pendex/core';
import { compileJob, resolveExcludes, runCompile } from '../src';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX = './test-sandbox-compileservice';

const baseConfig = (): Config => ({
    theme: 'pendex',
    outputDir: 'OUT',
    rebuiltDir: 'REBUILT',
    exclude: ['OUT/**', 'REBUILT/**'],
    jobs: [
        {
            filename: 'code.txt',
            category: 'source',
            description: 'Source files',
            include: ['src/**/*.ts'],
            exclude: [],
        },
        {
            filename: 'misc.txt',
            category: 'misc',
            description: 'Everything else',
            include: [],
            exclude: [],
        },
    ],
});

describe('@pendex/compile — CompileService (standalone)', () => {
    const originalCwd = process.cwd();

    beforeEach(async () => {
        await createSandbox(SANDBOX);
        process.chdir(SANDBOX);
        mkdirSync('src', { recursive: true });
        writeFileSync('src/index.ts', 'console.log("hello");\n');
        writeFileSync('readme.md', '# readme\n');
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX);
    });

    test('resolveExcludes merges .gitignore with config excludes', async () => {
        writeFileSync('.gitignore', 'dist/\n');
        const excludes = await resolveExcludes(baseConfig());
        expect(excludes).toContain('dist/');
    });

    test('runCompile writes archives, manifest, and per-job categories', async () => {
        await runCompile(baseConfig());

        const manifest: Manifest = await Bun.file(
            join('OUT', 'manifest.json'),
        ).json();
        expect(manifest.files['code.txt']).toContain('src/index.ts');
        expect(manifest.categories?.['code.txt']).toBe('source');
        expect(manifest.categories?.['misc.txt']).toBe('misc');
    });

    test('compileJob returns fileCount 0 for a job matching nothing', async () => {
        mkdirSync('OUT', { recursive: true });
        const manifest: Manifest = { files: {}, emptyDirectories: [] };
        const outcome = await compileJob({
            job: {
                filename: 'none.txt',
                category: 'web',
                description: 'x',
                include: ['**/*.nope'],
                exclude: [],
            },
            excludes: [],
            outputDir: 'OUT',
            manifest,
            claimedPaths: new Set(),
        });
        expect(outcome.fileCount).toBe(0);
    });
});
