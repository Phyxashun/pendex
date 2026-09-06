// FILE-PATH: packages/core/tests/archiveformat.test.ts
//
import { describe, expect, test } from 'bun:test';
import {
    archivePathFor,
    buildArchiveEntry,
    joinArchiveEntries,
    parseArchive,
} from '../src';

describe('ArchiveFormat (frame-delimited, verbatim, no tearline)', () => {
    test('build → parse recovers path and content exactly', () => {
        const original = 'console.log("hello");';
        const results = parseArchive(
            buildArchiveEntry('src/index.ts', original),
        );

        expect(results).toHaveLength(1);
        expect(results[0]!.originalPath).toBe('src/index.ts');
        expect(results[0]!.content).toBe(original);
    });

    test('verbatim edge cases: trailing newlines, empty file, CRLF, leading whitespace', () => {
        for (const original of [
            'x\n',
            'x\n\n',
            '',
            '\n',
            'a\r\nb\r\n',
            '\n  indented\n',
        ]) {
            const results = parseArchive(
                buildArchiveEntry('src/f.ts', original),
            );
            expect(results).toHaveLength(1);
            expect(results[0]!.content).toBe(original);
        }
    });

    test('multiple entries round-trip without any separator between them', () => {
        const joined = joinArchiveEntries([
            buildArchiveEntry('src/a.ts', 'one\n'),
            buildArchiveEntry('src/b.ts', 'two'),
            buildArchiveEntry('src/c.ts', 'three\n'),
        ]);
        const results = parseArchive(joined);

        expect(results).toHaveLength(3);
        expect(results[0]!.content).toBe('one\n');
        expect(results[1]!.content).toBe('two');
        expect(results[2]!.originalPath).toBe('src/c.ts');
    });

    test('rebuilt content contains no banner residue', () => {
        const results = parseArchive(
            buildArchiveEntry('a/b.ts', 'const x = 1;'),
        );
        const content = results[0]!.content;

        expect(content).not.toContain('■');
        expect(content).not.toContain('// PATH');
        expect(content).not.toContain('// PROCESSED');
    });

    test('FULL self-hosting: an entire archive as content survives byte-perfect', () => {
        // The path-matched END frame is what makes this work: the inner
        // entries' frames carry inner paths, so they can never terminate
        // the outer entry. The old tearline format could not do this.
        const innerArchive = joinArchiveEntries([
            buildArchiveEntry('inner/x.ts', 'inner content\n'),
            buildArchiveEntry('inner/y.ts', 'more inner'),
        ]);
        const outer = joinArchiveEntries([
            buildArchiveEntry('OUT/code.txt', innerArchive),
            buildArchiveEntry('after.ts', 'still here'),
        ]);

        const results = parseArchive(outer);
        expect(results).toHaveLength(2);
        expect(results[0]!.originalPath).toBe('OUT/code.txt');
        expect(results[0]!.content).toBe(innerArchive);
        expect(results[1]!.content).toBe('still here');
    });

    test('garbage between entries is skipped, never fatal', () => {
        const raw = `random junk\n${buildArchiveEntry('a.ts', 'one')}\nnoise\n${buildArchiveEntry('b.ts', 'two')}\ntrailing`;
        const results = parseArchive(raw);
        expect(results).toHaveLength(2);
        expect(results[0]!.content).toBe('one');
        expect(results[1]!.content).toBe('two');
    });

    test('an unterminated START frame is skipped without consuming later entries', () => {
        const startOnly = buildArchiveEntry('lost.ts', 'orphan')
            .split('\n')
            .slice(0, 8)
            .join('\n');
        const raw = `${startOnly}\n\n${buildArchiveEntry('ok.ts', 'fine')}`;
        const results = parseArchive(raw);
        expect(results).toHaveLength(1);
        expect(results[0]!.originalPath).toBe('ok.ts');
    });

    test('empty input and pure junk yield an empty result set', () => {
        expect(parseArchive('')).toHaveLength(0);
        expect(parseArchive('just some text')).toHaveLength(0);
    });

    test('a frame with a blank path is not treated as an entry', () => {
        const entry = buildArchiveEntry('src/x.ts', 'content');
        const lines = entry.split('\n');
        lines[3] = '// PATH     :    '; // start frame path blanked
        expect(parseArchive(lines.join('\n'))).toHaveLength(0);
    });

    test('windows-style path separators are normalized to posix', () => {
        const results = parseArchive(
            buildArchiveEntry('src\\utils\\helper.ts', 'x'),
        );
        expect(results[0]!.originalPath).toBe('src/utils/helper.ts');
    });

    test('archivePathFor joins output paths', () => {
        expect(archivePathFor('OUT', 'code.txt')).toBe('OUT/code.txt');
    });
});
