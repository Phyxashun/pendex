// FILE-PATH: packages/theme/tests/theme.test.ts
//
import { Colors } from '@pendex/color';
import { beforeAll, describe, expect, test } from 'bun:test';
import { FALLBACK_THEME, FallbackTheme, useTheme } from '../src';

const ALL_STYLE_KEYS = [
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
    'muted',
    'title',
    'subtitle',
    'color',
    'backgroundColor',
    'bold',
    'italic',
    'textDecoration',
] as const;

describe('Theme System (chaining engine over the fallback brand theme)', (): void => {
    beforeAll((): void => Colors.enable());

    test('every style method renders the text', (): void => {
        for (const key of ALL_STYLE_KEYS) {
            expect(FallbackTheme[key]('test').toString()).toContain('test');
        }

        expect(FallbackTheme.textTransform('test').toString()).toBe('TEST');
    });

    test('styles chain (stacked before text arrives)', (): void => {
        expect(FallbackTheme.primary.bold('test').toString()).toContain('test');
    });

    test('callable syntax: text first, style after (eager application)', (): void => {
        expect(FallbackTheme('test').primary.toString()).toContain('test');
    });

    test('supports eager multi-style chaining after text exists', (): void => {
        const rendered = FallbackTheme('test').primary.bold.italic.toString();

        expect(rendered).toContain('test');
    });

    test('string coercion via template literal, String(), and valueOf()', (): void => {
        expect(`${FallbackTheme.bold('x')}`).toContain('x');
        expect(String(FallbackTheme.error('y'))).toContain('y');
        expect(FallbackTheme.info('z').valueOf()).toContain('z');
    });

    test('explicit toString returns the compiled value', (): void => {
        expect(FallbackTheme.warning('warn').toString()).toContain('warn');
    });

    test('calling with no text yields an empty renderable', (): void => {
        expect(`${FallbackTheme()}`).toBe('');
    });

    test('unknown property resolves to undefined (Proxy fall-through)', (): void => {
        const themeAsRecord = FallbackTheme as unknown as Record<
            string,
            unknown
        >;

        expect(themeAsRecord['definitelyNotAStyle']).toBeUndefined();
    });

    test('useTheme() can wrap FALLBACK_THEME directly and behaves like FallbackTheme export', (): void => {
        const localTheme = useTheme(FALLBACK_THEME);

        expect(localTheme.primary('same').toString()).toContain('same');
        expect(localTheme.textTransform('abc').toString()).toBe('ABC');
    });
});
