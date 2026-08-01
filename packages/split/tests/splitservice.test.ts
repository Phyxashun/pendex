// FILE-PATH: packages/split/tests/splitservice.test.ts
//
// Proves @pendex/split is independently testable — this package never
// imports @pendex/compile; the archives it splits here are constructed
// by hand via @pendex/core's buildArchiveEntry/joinArchiveEntries
// (the same format Compile would produce), not by running Compile.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildArchiveEntry, joinArchiveEntries } from '@pendex/core';
import { readManifest, runSplit, splitArchiveFile } from '../src';

const SANDBOX = './test-sandbox-splitservice';

describe('@pendex/split — SplitService (standalone)', () => {
    const originalCwd = process.cwd();

    beforeEach(() => {
        mkdirSync(SANDBOX, { recursive: true });
        process.chdir(SANDBOX);
        mkdirSync('OUT', { recursive: true });

        const archive = joinArchiveEntries([
            buildArchiveEntry('src/a.ts', 'export const a = 1;\n'),
        ]);
        writeFileSync(join('OUT', 'code.txt'), archive);
        writeFileSync(
            join('OUT', 'manifest.json'),
            JSON.stringify({
                files: { 'code.txt': ['src/a.ts'] },
                categories: { 'code.txt': 'source' },
                emptyDirectories: [],
            }),
        );
    });

    afterEach(() => {
        process.chdir(originalCwd);
        mkdirSync(SANDBOX, { recursive: true }); // no-op if present; cleanup below
    });

    test('readManifest reads a hand-built manifest correctly', async () => {
        const manifest = await readManifest('OUT');
        expect(manifest?.files['code.txt']).toEqual(['src/a.ts']);
        expect(manifest?.categories?.['code.txt']).toBe('source');
    });

    test('splitArchiveFile rebuilds the original file byte-perfect', async () => {
        const outcome = await splitArchiveFile('OUT', 'REBUILT', 'code.txt');
        expect(outcome.filesRecreated).toBe(1);

        const rebuilt = await Bun.file(join('REBUILT', 'src', 'a.ts')).text();
        expect(rebuilt).toBe('export const a = 1;\n');
    });

    test('runSplit reports manifestFound: false with no manifest present', async () => {
        const summary = await runSplit('NO_SUCH_DIR', 'REBUILT');
        expect(summary.manifestFound).toBe(false);
    });
});
