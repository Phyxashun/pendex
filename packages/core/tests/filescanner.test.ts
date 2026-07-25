
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
    findEmptyDirectories,
    loadIgnorePatterns,
    resolveJobFiles,
} from '../src';
import type { Job } from '../src';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX = './test-sandbox-scanner';

const makeJob = (include: string[], exclude: string[] = []): Job => ({
    filename: 'x.txt', category: 'source', description: 'test job', include, exclude,
});

describe('FileScanner', () => {
    const originalCwd = process.cwd();

    beforeEach(async () => {
        await createSandbox(SANDBOX);
        process.chdir(SANDBOX);
        mkdirSync('src', { recursive: true });
        writeFileSync('src/a.ts', 'a');
        writeFileSync('src/b.ts', 'b');
        writeFileSync('notes.md', 'notes');
        writeFileSync('skip.log', 'log');
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX);
    });

    describe('loadIgnorePatterns', () => {
        test('returns [] when the file does not exist', async () => {
            expect(await loadIgnorePatterns('./no-such-ignore-file')).toEqual([]);
        });

        test('strips comments and blank lines', async () => {
            writeFileSync('.testignore', '# comment\n\nnode_modules/\ndist/\n   \n');
            const patterns = await loadIgnorePatterns('.testignore');
            expect(patterns).toEqual(['node_modules/', 'dist/']);
        });
    });

    describe('resolveJobFiles — normal jobs', () => {
        test('matches include globs minus excludes', async () => {
            const files = await resolveJobFiles(makeJob(['src/**/*.ts'], ['**/b.ts']), ['**/b.ts'], new Set());
            expect(files.map(f => f.replace(/\\/g, '/'))).toEqual(['src/a.ts']);
        });

        test('deduplicates a file matched by multiple patterns', async () => {
            const files = await resolveJobFiles(makeJob(['src/**/*.ts', '**/a.ts']), [], new Set());
            const posix = files.map(f => f.replace(/\\/g, '/'));
            expect(posix.filter(f => f === 'src/a.ts')).toHaveLength(1);
        });
    });

    describe('resolveJobFiles — remainder jobs (empty include)', () => {
        test('picks up everything not claimed and not excluded', async () => {
            const claimed = new Set(['src/a.ts', 'src/b.ts']);
            const files = await resolveJobFiles(makeJob([]), ['**/*.log'], claimed);
            const posix = files.map(f => f.replace(/\\/g, '/')).sort();

            expect(posix).toContain('notes.md');
            expect(posix).not.toContain('src/a.ts');   // claimed
            expect(posix).not.toContain('src/b.ts');   // claimed
            expect(posix).not.toContain('skip.log');   // excluded
        });

        test('with nothing claimed or excluded, sees all files', async () => {
            const files = await resolveJobFiles(makeJob([]), [], new Set());
            expect(files.length).toBe(4);
        });
    });

    describe('findEmptyDirectories', () => {
        test('finds empty dirs and skips excluded ones', async () => {
            mkdirSync('empty-one', { recursive: true });
            mkdirSync('excluded-empty', { recursive: true });
            mkdirSync('src/nested-empty', { recursive: true });

            const dirs = (await findEmptyDirectories('.', ['excluded-empty/**', 'excluded-empty/']))
                .map(d => d.replace(/\\/g, '/')).sort();

            expect(dirs).toContain('empty-one');
            expect(dirs).toContain('src/nested-empty');
            expect(dirs).not.toContain('excluded-empty');
            expect(dirs).not.toContain('src'); // non-empty dirs excluded
        });

        test('returns [] when no empty dirs exist', async () => {
            expect(await findEmptyDirectories('src', [])).toEqual([]);
        });
    });
});
