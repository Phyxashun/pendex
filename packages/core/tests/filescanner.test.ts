// FILE-PATH: packages/core/tests/filescanner.test.ts
//

/**
 * @file packages/core/tests/filescanner.test.ts
 * @description Unit tests for `FileScanner.ts` glob resolution, ignore pattern loading, and empty directory detection.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    findEmptyDirectories,
    loadIgnorePatterns,
    resolveJobFiles,
    type Job,
} from '../src';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-filescanner-${process.pid}`,
);
const ORIGINAL_CWD: string = process.cwd();

const makeJob = (include: string[], exclude: string[] = []): Job => ({
    filename: 'x.txt',
    category: 'source',
    description: 'test job',
    include,
    exclude,
});

describe('FileScanner', (): void => {
    beforeAll(async (): Promise<void> => {
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);

        mkdirSync('src', { recursive: true });
        writeFileSync('src/a.ts', 'a');
        writeFileSync('src/b.ts', 'b');
        writeFileSync('notes.md', 'notes');
        writeFileSync('skip.log', 'log');
    });

    afterAll(async (): Promise<void> => {
        process.chdir(ORIGINAL_CWD);
        await cleanupSandbox(SANDBOX_DIR);
    });

    describe('loadIgnorePatterns', (): void => {
        test('returns [] when the file does not exist', async (): Promise<void> => {
            const patterns = await loadIgnorePatterns('./no-such-ignore-file');
            expect(patterns).toEqual([]);
        });

        test('strips comments and blank lines', async (): Promise<void> => {
            writeFileSync(
                '.testignore',
                '# comment\n\nnode_modules/\ndist/\n   \n',
            );
            const patterns = await loadIgnorePatterns('.testignore');
            expect(patterns).toEqual(['node_modules/', 'dist/']);
        });
    });

    describe('resolveJobFiles — normal jobs', (): void => {
        test('matches include globs minus excludes', async (): Promise<void> => {
            const files = await resolveJobFiles(
                makeJob(['src/**/*.ts'], ['**/b.ts']),
                ['**/b.ts'],
                new Set(),
            );
            expect(files.map(f => f.replace(/\\/g, '/'))).toEqual(['src/a.ts']);
        });

        test('deduplicates a file matched by multiple patterns', async (): Promise<void> => {
            const files = await resolveJobFiles(
                makeJob(['src/**/*.ts', '**/a.ts']),
                [],
                new Set(),
            );
            const posix = files.map(f => f.replace(/\\/g, '/'));
            expect(posix.filter(f => f === 'src/a.ts')).toHaveLength(1);
        });
    });

    describe('resolveJobFiles — remainder jobs (empty include)', (): void => {
        test('picks up everything not claimed and not excluded', async (): Promise<void> => {
            const claimed = new Set(['src/a.ts', 'src/b.ts']);
            const files = await resolveJobFiles(
                makeJob([]),
                ['**/*.log'],
                claimed,
            );
            const posix = files.map(f => f.replace(/\\/g, '/')).sort();

            expect(posix).toContain('notes.md');
            expect(posix).not.toContain('src/a.ts');
            expect(posix).not.toContain('src/b.ts');
            expect(posix).not.toContain('skip.log');
        });

        test('with nothing claimed or excluded, sees all files', async (): Promise<void> => {
            const files = await resolveJobFiles(makeJob([]), [], new Set());
            expect(files.length).toBe(5);
        });
    });

    describe('findEmptyDirectories', (): void => {
        test('finds empty dirs and skips excluded ones', async (): Promise<void> => {
            mkdirSync('empty-one', { recursive: true });
            mkdirSync('excluded-empty', { recursive: true });
            mkdirSync('src/nested-empty', { recursive: true });

            const dirs = (
                await findEmptyDirectories('.', [
                    '**/excluded-empty/**',
                    '**/excluded-empty',
                    'excluded-empty/**',
                    'excluded-empty',
                ])
            )
                .map(d => d.replace(/\\/g, '/'))
                .sort();

            expect(dirs).toContain('empty-one');
            expect(dirs).toContain('src/nested-empty');
            expect(dirs.some(d => d.includes('excluded-empty'))).toBe(false);
            expect(dirs).not.toContain('src');
        });

        test('returns [] when no empty dirs exist', async (): Promise<void> => {
            const result = await findEmptyDirectories('src', []);
            expect(result.filter(d => !d.includes('nested-empty'))).toEqual([]);
        });
    });
});
