// FILE-PATH: packages/theme/tests/themepalette.test.ts
//
// Unit tests for ThemePalette's pure functions — no file I/O, so every
// edge case (partial files, garbage tables, wrong top-level types,
// normalization/fallback behavior, and buildTheme output) is exercised
// directly instead of through a real TOML file on disk.
// ThemeManager.test.ts covers the file-loading integration.

import { Colors } from '@pendex/color';
import { describe, expect, test } from 'bun:test';
import {
    type DefaultTheme,
    type PendexTheme,
    BRAND_PALETTE,
    FALLBACK_THEME,
    THEME_COLOR_KEYS,
    buildTheme,
    parsePendexTheme,
} from '../src';

Colors.enable();

describe('ThemePalette constants', (): void => {
    test('THEME_COLOR_KEYS defines the required root slots in order', (): void => {
        expect(THEME_COLOR_KEYS).toEqual([
            'primary',
            'secondary',
            'success',
            'warning',
            'error',
            'info',
            'muted',
            'foreground',
            'background',
            'titleBg',
        ]);
    });

    test('BRAND_PALETTE provides every required color slot', (): void => {
        for (const key of THEME_COLOR_KEYS) {
            expect(BRAND_PALETTE[key]).toMatch(/^#[0-9A-F]{6}$/);
        }
    });

    test('FALLBACK_THEME is a ready-to-use DefaultTheme', (): void => {
        const styled = FALLBACK_THEME.primary('fallback').toString();

        expect(styled).toContain('fallback');
        expect(typeof FALLBACK_THEME.bold).toBe('function');
        expect(typeof FALLBACK_THEME.textTransform).toBe('function');
    });
});

describe('buildTheme', (): void => {
    test('returns a working DefaultTheme whose semantic color slots render text', (): void => {
        const theme: DefaultTheme = buildTheme(BRAND_PALETTE);

        expect(theme.primary('x')).toContain('x');
        expect(theme.secondary('x')).toContain('x');
        expect(theme.success('x')).toContain('x');
        expect(theme.warning('x')).toContain('x');
        expect(theme.error('x')).toContain('x');
        expect(theme.info('x')).toContain('x');
        expect(theme.muted('x')).toContain('x');
    });

    test('title, subtitle, color, and backgroundColor render text', (): void => {
        const theme: DefaultTheme = buildTheme(BRAND_PALETTE);

        expect(theme.title('Title')).toContain('Title');
        expect(theme.subtitle('Subtitle')).toContain('Subtitle');
        expect(theme.color('Body')).toContain('Body');
        expect(theme.backgroundColor('Bg')).toContain('Bg');
    });

    test('bold, italic, underline, and textTransform work', (): void => {
        const theme: DefaultTheme = buildTheme(BRAND_PALETTE);

        expect(theme.bold('bold')).toContain('bold');
        expect(theme.italic('italic')).toContain('italic');
        expect(theme.textDecoration('underline')).toContain('underline');
        expect(theme.textTransform('mixedCase')).toBe('MIXEDCASE');
    });

    test('uses palette colors in output ANSI sequences', (): void => {
        const theme: DefaultTheme = buildTheme(BRAND_PALETTE);

        const primary = theme.primary('p');
        const background = theme.backgroundColor('b');

        // Brass #D6A448 = rgb(214, 164, 72)
        expect(primary).toContain('38;2;214;164;72');

        // Background #1A1A1A = rgb(26, 26, 26)
        expect(background).toContain('48;2;26;26;26');
    });
});

describe('parsePendexTheme', (): void => {
    test('reads color scalars off the root, not a nested [colors] table', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                name: 'X',
                primary: '#111111',
            },
            'fallback',
        );

        expect(theme.colors.primary).toBe('#111111');
    });

    test('a theme overriding one color still gets a complete ThemeColors via brand fallback', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                primary: '#FF00FF',
            },
            'partial',
        );

        expect(theme.colors.primary).toBe('#FF00FF');
        expect(theme.colors.secondary).toBe(BRAND_PALETTE.secondary);
        expect(theme.colors.background).toBe(BRAND_PALETTE.background);
    });

    test('captures metadata fields when present', (): void => {
        const theme: PendexTheme = parsePendexTheme(
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

    test('missing metadata fields are undefined, not thrown', (): void => {
        const theme: PendexTheme = parsePendexTheme({}, 'fallback-name');

        expect(theme.name).toBe('fallback-name');
        expect(theme.author).toBeUndefined();
        expect(theme.version).toBeUndefined();
        expect(theme.description).toBeUndefined();
    });

    test('captures every extended table present in the file', (): void => {
        const theme: PendexTheme = parsePendexTheme(
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

    test('an absent table is undefined, not an empty object', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                name: 'X',
            },
            'fallback',
        );

        expect(theme.brand).toBeUndefined();
        expect(theme.ansi).toBeUndefined();
    });

    test('an empty object table degrades to undefined', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                brand: {},
                ansi: {},
            },
            'fallback',
        );

        expect(theme.brand).toBeUndefined();
        expect(theme.ansi).toBeUndefined();
    });

    test('non-string entries inside a table are dropped, not thrown', (): void => {
        const theme: PendexTheme = parsePendexTheme(
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

    test('non-object scalar tables degrade to undefined, while array input is treated as an indexable object by the current parser', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                ansi: 'not-a-table',
                git: 42,
                syntax: ['array'],
            },
            'x',
        );

        expect(theme.ansi).toBeUndefined();
        expect(theme.git).toBeUndefined();

        // Arrays are objects in JS, and the current extractTable() keeps
        // string-valued entries it can enumerate, so ['array'] becomes
        // { "0": "array" } rather than undefined.
        expect(theme.syntax).toEqual({
            0: 'array',
        });
    });

    test('normalizes valid hex values to uppercase and trims whitespace', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                primary: '  #aa11cc ',
                secondary: '#bb22dd',
            },
            'norm',
        );

        expect(theme.colors.primary).toBe('#AA11CC');
        expect(theme.colors.secondary).toBe('#BB22DD');
    });

    test('invalid hex values fall back slot-by-slot to BRAND_PALETTE', (): void => {
        const theme: PendexTheme = parsePendexTheme(
            {
                primary: '#12345', // invalid length
                secondary: 'blue', // invalid format
                success: '#12GG12', // invalid chars
                warning: 42,
            },
            'fallback-test',
        );

        expect(theme.colors.primary).toBe(BRAND_PALETTE.primary);
        expect(theme.colors.secondary).toBe(BRAND_PALETTE.secondary);
        expect(theme.colors.success).toBe(BRAND_PALETTE.success);
        expect(theme.colors.warning).toBe(BRAND_PALETTE.warning);
    });

    test('malformed top-level input (null, number, string, array, boolean) degrades to full brand palette, never throws', (): void => {
        const BAD_VALUES = [null, undefined, 42, 'a string', [], true] as const;

        for (const bad of BAD_VALUES) {
            const theme: PendexTheme = parsePendexTheme(bad, 'fallback-name');

            expect(theme.name).toBe('fallback-name');
            expect(theme.colors).toEqual(BRAND_PALETTE);
            expect(theme.brand).toBeUndefined();
        }
    });
});
