// FILE-PATH: packages/theme/tests/thememanager.test.ts
//
import { Colors } from '@pendex/color';
import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import {
    type DefaultTheme,
    type PendexTheme,
    type Theme,
    BRAND_PALETTE,
    ThemeManager,
} from '../src';

type BrandType = Record<string, string> | undefined;

describe('ThemeManager (TOML theme loading)', (): void => {
    beforeAll((): void => Colors.enable());
    afterEach((): void => {
        ThemeManager.resetInstance();
        mock.restore();
    });

    test('loads pendex and produces a working chainable Theme', async (): Promise<void> => {
        const manager: ThemeManager = await ThemeManager.getInstance('pendex');

        expect(manager.name()).toBe('pendex');

        const theme: Theme = manager.get();
        const styled: string = theme.primary('hello').toString();

        expect(styled).toContain('hello');

        // Brass #D6A448 = rgb(214, 164, 72)
        expect(styled).toContain('38;2;214;164;72');
    });

    test('getInstance() with no name defaults to pendex', async (): Promise<void> => {
        const manager: ThemeManager = await ThemeManager.getInstance();

        expect(manager.name()).toBe('pendex');
    });

    test('loads each shipped theme file', async (): Promise<void> => {
        const THEME_NAMES = [
            'pendex',
            'dracula',
            'tokyonight',
            'onedark',
            'monokaipro',
        ] as const;

        for (const name of THEME_NAMES) {
            ThemeManager.resetInstance();

            const manager: ThemeManager = await ThemeManager.getInstance(name);

            expect(manager.name()).toBe(name);
            expect(manager.get().success('ok').toString()).toContain('ok');
        }
    });

    test("extended() exposes pendex.toml's full schema, including tables buildTheme() never reads", async (): Promise<void> => {
        const manager: ThemeManager = await ThemeManager.getInstance('pendex');
        const extended: PendexTheme = manager.extended();

        expect(extended.name).toBe('Pendex');
        expect(extended.author).toBe('Dusty Dew');
        expect(extended.description).toContain('parchment');

        expect(extended.colors.primary).toBe('#D6A448');
        expect(extended.colors.background).toBe('#1A1A1A');
        expect(extended.colors.titleBg).toBe('#262626');

        expect(extended.palette?.brass).toBe('#D6A448');
        expect(extended.ansi?.black).toBeDefined();
        expect(extended.syntax?.keyword).toBeDefined();
        expect(extended.git?.added).toBeDefined();
        expect(extended.diagnostics?.hint).toBeDefined();
        expect(extended.diff?.addedBackground).toBeDefined();
        expect(extended.brand?.bookCover).toBeDefined();

        const CATEGORY_NAMES = [
            'source',
            'web',
            'style',
            'terminal',
            'configuration',
            'documentation',
            'testing',
            'misc',
        ] as const;

        for (const category of CATEGORY_NAMES) {
            expect(extended.brand?.[category]).toBeDefined();
        }
    });

    test('every shipped theme defines a complete [brand] table for category keys', async (): Promise<void> => {
        const THEME_NAMES = [
            'dracula',
            'tokyonight',
            'onedark',
            'monokaipro',
        ] as const;

        const CATEGORY_NAMES = [
            'source',
            'web',
            'style',
            'terminal',
            'configuration',
            'documentation',
            'testing',
            'misc',
        ] as const;

        for (const name of THEME_NAMES) {
            ThemeManager.resetInstance();

            const manager: ThemeManager = await ThemeManager.getInstance(name);
            const brand: BrandType = manager.extended().brand;

            for (const category of CATEGORY_NAMES) {
                expect(brand?.[category]).toBeDefined();
            }
        }
    });

    test('extended() degrades to brand-only (no tables) for an unknown theme', async (): Promise<void> => {
        const manager: ThemeManager = await ThemeManager.getInstance(
            'no-such-theme-either',
        );
        const extended: PendexTheme = manager.extended();

        expect(extended.name).toBe('no-such-theme-either');
        expect(extended.colors).toEqual(BRAND_PALETTE);
        expect(extended.brand).toBeUndefined();
        expect(extended.ansi).toBeUndefined();
    });

    test('dracula theme uses the dracula purple for primary', async (): Promise<void> => {
        const manager: ThemeManager = await ThemeManager.getInstance('dracula');

        // #BD93F9 = rgb(189, 147, 249)
        expect(manager.get().primary('p').toString()).toContain(
            '38;2;189;147;249',
        );
    });

    test('an unknown theme name degrades to the brand palette, never throws', async (): Promise<void> => {
        const manager: ThemeManager =
            await ThemeManager.getInstance('no-such-theme');

        const styled: string = manager.get().primary('safe').toString();

        expect(styled).toContain('safe');
        expect(styled).toContain('38;2;214;164;72');
    });

    test('getInstance returns the same instance regardless of later names', async (): Promise<void> => {
        const first: ThemeManager = await ThemeManager.getInstance('dracula');
        const second: ThemeManager = await ThemeManager.getInstance('onedark');

        expect(second).toBe(first);
        expect(second.name()).toBe('dracula');
    });

    test('raw() exposes the flat DefaultTheme before proxy wrapping', async (): Promise<void> => {
        const manager: ThemeManager = await ThemeManager.getInstance('pendex');
        const raw: DefaultTheme = manager.raw();

        expect(raw.primary('raw')).toContain('raw');
        expect(raw.textTransform('abc')).toBe('ABC');
    });

    test('concurrent first calls share the same in-flight singleton promise', async (): Promise<void> => {
        const [a, b, c] = await Promise.all([
            ThemeManager.getInstance('pendex'),
            ThemeManager.getInstance('dracula'),
            ThemeManager.getInstance('onedark'),
        ]);

        expect(a).toBe(b);
        expect(b).toBe(c);
        expect(['pendex', 'dracula', 'onedark']).toContain(a.name());
    });

    test('parse failure while reading a file degrades safely to brand fallback', async (): Promise<void> => {
        const originalFile = Bun.file;
        const originalParse = Bun.TOML.parse;

        await mock.module('bun', () => ({
            BunFile: class {},
        }));

        // Patch globals directly for Bun runtime behavior
        // @ts-expect-error test patch
        Bun.file = (() => ({
            exists: async () => true,
            text: async () => 'not actually valid toml',
        })) as typeof Bun.file;

        Bun.TOML.parse = (() => {
            throw new Error('parse failure');
        }) as typeof Bun.TOML.parse;

        try {
            const manager: ThemeManager =
                await ThemeManager.getInstance('broken-theme');

            expect(manager.name()).toBe('broken-theme');
            expect(manager.extended().colors).toEqual(BRAND_PALETTE);
            expect(manager.get().primary('safe').toString()).toContain('safe');
        } finally {
            Bun.file = originalFile;
            Bun.TOML.parse = originalParse;
        }
    });

    test('missing file path degrades safely to brand fallback', async (): Promise<void> => {
        const originalFile = Bun.file;

        // @ts-expect-error
        Bun.file = (() => ({
            exists: async () => false,
            text: async () => {
                throw new Error('should not be called');
            },
        })) as typeof Bun.file;

        try {
            const manager: ThemeManager =
                await ThemeManager.getInstance('missing-theme');

            expect(manager.name()).toBe('missing-theme');
            expect(manager.extended().colors).toEqual(BRAND_PALETTE);
        } finally {
            Bun.file = originalFile;
        }
    });
});
