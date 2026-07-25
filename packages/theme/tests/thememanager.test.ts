// FILE-PATH: tests/thememanager.test.ts

import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { Colors } from '@pendex/color';
import { ThemeManager } from '../src';

describe('ThemeManager (TOML theme loading)', () => {
    beforeAll(() => Colors.enable());
    afterEach(() => ThemeManager.resetInstance());

    test('loads pendex — the canonical theme — and produces a working chainable Theme', async () => {
        const manager = await ThemeManager.getInstance('pendex');
        expect(manager.name()).toBe('pendex');

        const theme = manager.get();
        const styled = theme.primary('hello').toString();
        expect(styled).toContain('hello');
        // Brass #D6A448 = rgb(214, 164, 72) as truecolor:
        expect(styled).toContain('38;2;214;164;72');
    });

    test('getInstance() with no name defaults to pendex', async () => {
        const manager = await ThemeManager.getInstance();
        expect(manager.name()).toBe('pendex');
    });

    test('loads each shipped theme file', async () => {
        for (const name of ['pendex', 'dracula', 'tokyonight', 'onedark', 'monokaipro']) {
            ThemeManager.resetInstance();
            const manager = await ThemeManager.getInstance(name);
            expect(manager.name()).toBe(name);
            expect(manager.get().success('ok').toString()).toContain('ok');
        }
    });

    test('extended() exposes pendex.toml\'s full schema, including tables buildTheme() never reads', async () => {
        const manager = await ThemeManager.getInstance('pendex');
        const extended = manager.extended();

        expect(extended.name).toBe('Pendex');
        expect(extended.author).toBe('Dusty Dew');
        expect(extended.description).toContain('parchment');

        // Color scalars sit at the file's root, not nested under [colors]:
        expect(extended.colors.primary).toBe('#D6A448');
        expect(extended.colors.background).toBe('#1A1A1A');
        expect(extended.colors.titleBg).toBe('#262626');

        // Extended tables the chainable Theme never consumes:
        expect(extended.palette?.brass).toBe('#D6A448');
        expect(extended.ansi?.brightWhite).toBe('#F7F2E8');
        expect(extended.syntax?.keyword).toBe('#C78C5C');
        expect(extended.git?.deleted).toBe('#C57967');
        expect(extended.diagnostics?.warning).toBe('#D6A448');
        expect(extended.diff?.addedBackground).toBe('#2A3A2A');
        expect(extended.website?.linkHover).toBe('#6AAFB5');
        expect(extended.terminal?.cursor).toBe('#D6A448');

        // Brand-concept colors — one per job Category, plus book/paper/manifest:
        expect(extended.brand?.compile).toBe('#D6A448');
        expect(extended.brand?.split).toBe('#799470');
        expect(extended.brand?.source).toBe('#799470');
        expect(extended.brand?.manifest).toBe('#6AAFB5');

        // All 8 Category names resolve, exactly — this is what would have
        // silently broken had `configuration`/`documentation` stayed
        // abbreviated as `config`/`docs`:
        for (const category of ['source', 'web', 'style', 'terminal', 'configuration', 'documentation', 'testing', 'misc']) {
            expect(extended.brand?.[category]).toBeDefined();
        }
    });

    test('every shipped theme (not just pendex) defines a complete [brand] table', async () => {
        // The standard now requires every theme file to mirror pendex.toml's
        // full layout, [brand] included — this used to be pendex-only.
        for (const name of ['dracula', 'tokyonight', 'onedark', 'monokaipro']) {
            ThemeManager.resetInstance();
            const manager = await ThemeManager.getInstance(name);
            const brand = manager.extended().brand;

            for (const category of ['source', 'web', 'style', 'terminal', 'configuration', 'documentation', 'testing', 'misc']) {
                expect(brand?.[category]).toBeDefined();
            }
        }
    });

    test('extended() degrades to brand-only (no tables) for an unknown theme', async () => {
        const manager = await ThemeManager.getInstance('no-such-theme-either');
        const extended = manager.extended();

        expect(extended.name).toBe('no-such-theme-either');
        expect(extended.colors).toEqual({
            primary: '#D6A448', secondary: '#6F92B0', success: '#799470',
            warning: '#D99C5A', error: '#C57967', info: '#6AAFB5',
            muted: '#7B746B', foreground: '#E9E0D2', background: '#1A1A1A', titleBg: '#262626',
        });
        expect(extended.brand).toBeUndefined();
        expect(extended.ansi).toBeUndefined();
    });

    test('dracula theme uses the dracula purple for primary', async () => {
        const manager = await ThemeManager.getInstance('dracula');
        // #BD93F9 = rgb(189, 147, 249)
        expect(manager.get().primary('p').toString()).toContain('38;2;189;147;249');
    });

    test('an unknown theme name degrades to the brand palette, never throws', async () => {
        const manager = await ThemeManager.getInstance('no-such-theme');
        const styled = manager.get().primary('safe').toString();
        expect(styled).toContain('safe');
        expect(styled).toContain('38;2;214;164;72');   // brass fallback
    });

    test('getInstance returns the same instance regardless of later names', async () => {
        const first = await ThemeManager.getInstance('dracula');
        const second = await ThemeManager.getInstance('onedark');
        expect(second).toBe(first);
        expect(second.name()).toBe('dracula');
    });
});
