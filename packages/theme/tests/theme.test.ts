import { beforeAll, describe, expect, test } from 'bun:test';
import { Colors } from '@pendex/color';
import { FallbackTheme } from '../src';

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

describe('Theme System (chaining engine over the fallback brand theme)', () => {
    beforeAll(() => Colors.enable());

    test('every style method renders the text', () => {
        for (const key of ALL_STYLE_KEYS) {
            expect(FallbackTheme[key]('test').toString()).toContain('test');
        }
        expect(FallbackTheme.textTransform('test').toString()).toBe('TEST');
    });

    test('styles chain (stacked before text arrives)', () => {
        expect(FallbackTheme.primary.bold('test').toString()).toContain('test');
    });

    test('callable syntax: text first, style after (eager application)', () => {
        expect(FallbackTheme('test').primary.toString()).toContain('test');
    });

    test('string coercion via template literal (Symbol.toPrimitive)', () => {
        expect(`${FallbackTheme.bold('x')}`).toContain('x');
        expect(String(FallbackTheme.error('y'))).toContain('y');
    });

    test('calling with no text yields an empty renderable', () => {
        expect(`${FallbackTheme()}`).toBe('');
    });

    test('unknown property resolves to undefined (Proxy fall-through)', () => {
        const themeAsRecord = FallbackTheme as unknown as Record<
            string,
            unknown
        >;
        expect(themeAsRecord['definitelyNotAStyle']).toBeUndefined();
    });
});
