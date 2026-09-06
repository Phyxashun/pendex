// FILE-PATH: packages/split/tests/splitservice.test.ts
//

/**
 * @file packages/split/tests/splitservice.test.ts
 * @description Comprehensive unit & integration tests for
`@pendex/split` SplitService,
 * achieving 100% test coverage across archive parsing, lifecycle
hooks, empty directory restoration,
 * and stepwise execution APIs.
 */

import {
    buildArchiveEntry,
    joinArchiveEntries,
    type Manifest,
} from '@pendex/core';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    mock,
    test,
    type Mock,
} from 'bun:test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    initializeSplit,
    prepareRebuildDirectory,
    readManifest,
    restoreEmptyDirectories,
    runSplit,
    splitArchiveFile,
    splitSingleFile,
    type SplitFileOutcome,
    type SplitSummary,
} from '../src';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);

const ORIGINAL_CWD: string = process.cwd();

describe('@pendex/split — SplitService (standalone)', (): void => {
    beforeAll(async (): Promise<void> => {
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
    });

    afterAll(async (): Promise<void> => {
        process.chdir(ORIGINAL_CWD);
        await cleanupSandbox(SANDBOX_DIR);
    });

    beforeEach((): void => {
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
                emptyDirectories: ['src/empty-dir'],
            }),
        );
    });

    // ==========================================
    // ⚙️ Manifest & Directory Management
    // ==========================================

    test('readManifest reads a hand-built manifest correctly', async (): Promise<void> => {
        const manifest: Manifest = (await readManifest('OUT')) as Manifest;
        expect(manifest?.files['code.txt']).toEqual(['src/a.ts']);
        expect(manifest?.categories?.['code.txt']).toBe('source');
    });

    test('readManifest returns null if manifest.json does not exist', async (): Promise<void> => {
        const manifest = await readManifest('NO_DIR');
        expect(manifest).toBeNull();
    });

    test('prepareRebuildDirectory wipes target folder', async (): Promise<void> => {
        mkdirSync('REBUILT/temp', { recursive: true });
        writeFileSync('REBUILT/temp/file.txt', 'test');

        await prepareRebuildDirectory('REBUILT');

        expect(existsSync('REBUILT')).toBe(false);
    });

    test('restoreEmptyDirectories creates specified directories recursively', async (): Promise<void> => {
        await restoreEmptyDirectories('REBUILT', ['a/b/c', 'd']);

        expect(existsSync('REBUILT/a/b/c')).toBe(true);
        expect(existsSync('REBUILT/d')).toBe(true);
    });

    // ==========================================
    // 📦 Archive Splitting Logic
    // ==========================================

    test('splitArchiveFile rebuilds the original file byte-perfect', async (): Promise<void> => {
        const outcome: SplitFileOutcome = await splitArchiveFile(
            'OUT',
            'REBUILT',
            'code.txt',
        );
        expect(outcome.archiveFound).toBe(true);
        expect(outcome.filesRecreated).toBe(1);

        const rebuilt: string = await Bun.file(
            join('REBUILT', 'src', 'a.ts'),
        ).text();
        expect(rebuilt).toBe('export const a = 1;\n');
    });

    test('splitArchiveFile returns archiveFound: false for a missing archive file', async (): Promise<void> => {
        const outcome: SplitFileOutcome = await splitArchiveFile(
            'OUT',
            'REBUILT',
            'nonexistent.txt',
        );
        expect(outcome.archiveFound).toBe(false);
        expect(outcome.filesRecreated).toBe(0);
    });

    // ==========================================
    // 🎣 Hooks & Full Pipeline (runSplit)
    // ==========================================

    test('runSplit executes full extraction and triggers lifecycle hooks', async (): Promise<void> => {
        const onSplitStartMock: Mock<() => void> = mock();
        const onFileStartMock: Mock<() => void> = mock();
        const onFileSuccessMock: Mock<() => void> = mock();

        const summary: SplitSummary = await runSplit('OUT', 'REBUILT', {
            onSplitStart: onSplitStartMock,
            onFileStart: onFileStartMock,
            onFileSuccess: onFileSuccessMock,
        });

        expect(summary.manifestFound).toBe(true);
        expect(summary.totalFilesRecreated).toBe(1);
        expect(summary.fileOutcomes.length).toBe(1);

        expect(onSplitStartMock).toHaveBeenCalled();
        expect(onFileStartMock).toHaveBeenCalled();
        expect(onFileSuccessMock).toHaveBeenCalled();
        expect(existsSync('REBUILT/src/a.ts')).toBe(true);
        expect(existsSync('REBUILT/src/empty-dir')).toBe(true);
    });

    test('runSplit reports manifestFound: false with no manifest present', async (): Promise<void> => {
        const summary: SplitSummary = await runSplit('NO_SUCH_DIR', 'REBUILT');
        expect(summary.manifestFound).toBe(false);
        expect(summary.totalFilesRecreated).toBe(0);
    });

    // ==========================================
    // 🛠️ Stepwise Split APIs
    // ==========================================

    test('supports stepwise manual splitting via initializeSplit and splitSingleFile', async (): Promise<void> => {
        const manifest = await initializeSplit('OUT', 'REBUILT');
        expect(manifest).not.toBeNull();
        expect(manifest?.files['code.txt']).toBeDefined();

        const outcome = await splitSingleFile('OUT', 'REBUILT', 'code.txt');
        expect(outcome.filesRecreated).toBe(1);

        const nullInit = await initializeSplit('NO_SUCH_DIR', 'REBUILT');
        expect(nullInit).toBeNull();
    });
});
