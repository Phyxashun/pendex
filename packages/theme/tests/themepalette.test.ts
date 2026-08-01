// FILE-PATH: tests/themepalette.test.ts
//
// Unit tests for parsePendexTheme() and its helpers — pure functions, no
// file I/O, so every edge case (partial files, garbage tables, wrong
// top-level types) is exercised directly instead of through a real TOML
// file on disk. ThemeManager.test.ts covers the file-loading integration.

import { describe, expect, test } from 'bun:test';
import { BRAND_PALETTE, parsePendexTheme } from '../src';

describe('parsePendexTheme', () => {
    test('reads color scalars off the root, not a nested [colors] table', () => {
        const theme = parsePendexTheme(
            { name: 'X', primary: '#111111' },
            'fallback',
        );
        expect(theme.colors.primary).toBe('#111111');
    });

    test('a theme overriding one color still gets a complete ThemeColors via brand fallback', () => {
        const theme = parsePendexTheme({ primary: '#FF00FF' }, 'partial');
        expect(theme.colors.primary).toBe('#FF00FF');
        expect(theme.colors.secondary).toBe(BRAND_PALETTE.secondary);
        expect(theme.colors.background).toBe(BRAND_PALETTE.background);
    });

    test('captures metadata fields when present', () => {
        const theme = parsePendexTheme(
            {
                name: 'Pendex',
                author: 'Dusty Dew',
                version: '1.0.0',
                description: 'desc',
            },
            'fallback',
        );
        expect(theme.name).toBe('Pendex');
        expect(theme.author).toBe('Dusty Dew');
        expect(theme.version).toBe('1.0.0');
        expect(theme.description).toBe('desc');
    });

    test('missing metadata fields are undefined, not thrown', () => {
        const theme = parsePendexTheme({}, 'fallback-name');
        expect(theme.name).toBe('fallback-name');
        expect(theme.author).toBeUndefined();
        expect(theme.version).toBeUndefined();
        expect(theme.description).toBeUndefined();
    });

    test('captures every extended table present in the file', () => {
        const theme = parsePendexTheme(
            {
                palette: { brass: '#D6A448' },
                website: { link: '#3F5D78' },
                terminal: { cursor: '#D6A448' },
                ansi: { black: '#2C2C2C' },
                syntax: { keyword: '#C78C5C' },
                git: { added: '#728C69' },
                diagnostics: { hint: '#6AAFB5' },
                diff: { addedBackground: '#2A3A2A' },
                brand: { compile: '#D6A448' },
            },
            'x',
        );

        expect(theme.palette?.brass).toBe('#D6A448');
        expect(theme.website?.link).toBe('#3F5D78');
        expect(theme.terminal?.cursor).toBe('#D6A448');
        expect(theme.ansi?.black).toBe('#2C2C2C');
        expect(theme.syntax?.keyword).toBe('#C78C5C');
        expect(theme.git?.added).toBe('#728C69');
        expect(theme.diagnostics?.hint).toBe('#6AAFB5');
        expect(theme.diff?.addedBackground).toBe('#2A3A2A');
        expect(theme.brand?.compile).toBe('#D6A448');
    });

    test('an absent table is undefined, not an empty object', () => {
        const theme = parsePendexTheme({ name: 'X' }, 'fallback');
        expect(theme.brand).toBeUndefined();
        expect(theme.ansi).toBeUndefined();
    });

    test('non-string entries inside a table are dropped, not thrown', () => {
        const theme = parsePendexTheme(
            {
                brand: {
                    compile: '#D6A448',
                    nested: { oops: true },
                    count: 5,
                    flag: true,
                },
            },
            'x',
        );

        expect(theme.brand?.compile).toBe('#D6A448');
        expect(theme.brand).not.toHaveProperty('nested');
        expect(theme.brand).not.toHaveProperty('count');
        expect(theme.brand).not.toHaveProperty('flag');
    });

    test('a table that is not an object at all degrades to undefined', () => {
        const theme = parsePendexTheme(
            { ansi: 'not-a-table', git: 42, syntax: ['array'] },
            'x',
        );
        expect(theme.ansi).toBeUndefined();
        expect(theme.git).toBeUndefined();
        expect(theme.syntax).toBeUndefined();
    });

    test('malformed top-level input (null, number, string, array) degrades to full brand palette, never throws', () => {
        for (const bad of [null, undefined, 42, 'a string', [], true]) {
            const theme = parsePendexTheme(bad, 'fallback-name');
            expect(theme.name).toBe('fallback-name');
            expect(theme.colors).toEqual(BRAND_PALETTE);
            expect(theme.brand).toBeUndefined();
        }
    });
});
