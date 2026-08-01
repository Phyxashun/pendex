import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Colors } from '../src/Colors';

describe('Colors (picocolors drop-in + truecolor)', () => {
    // Force styling on so assertions are deterministic regardless of TTY.
    const wasEnabled = Colors.isEnabled;
    beforeAll(() => Colors.enable());
    afterAll(() => {
        if (!wasEnabled) Colors.disable();
    });

    test('named styles wrap text in ANSI codes', () => {
        expect(Colors.red('x')).toBe('\x1b[31mx\x1b[39m');
        expect(Colors.bold('x')).toBe('\x1b[1mx\x1b[22m');
        expect(Colors.bgMagenta('x')).toBe('\x1b[45mx\x1b[49m');
        expect(Colors.gray('x')).toBe(Colors.blackBright('x'));
    });

    test('nested same-family styles survive (close replaced by open)', () => {
        const inner = Colors.green('in');
        const outer = Colors.red(`a${inner}b`);
        // The green close (39) inside must have been reopened as red:
        expect(outer.endsWith('b\x1b[39m')).toBe(true);
        expect(outer).toContain('\x1b[31m');
    });

    test('hex produces 24-bit truecolor sequences', () => {
        expect(Colors.hex('#ff0000')('x')).toBe('\x1b[38;2;255;0;0mx\x1b[39m');
        expect(Colors.bgHex('#F6F1E8')('x')).toBe(
            '\x1b[48;2;246;241;232mx\x1b[49m',
        );
    });

    test('3-digit hex expands, leading # optional', () => {
        expect(Colors.hex('#f00')('x')).toBe(Colors.hex('ff0000')('x'));
    });

    test('invalid hex throws with the offending value', () => {
        expect(() => Colors.hex('#zzz')).toThrow('zzz');
        expect(() => Colors.hex('#12345')).toThrow();
    });

    test('disable() makes every styler an identity function', () => {
        Colors.disable();
        try {
            expect(Colors.red('plain')).toBe('plain');
            expect(Colors.hex('#ff0000')('plain')).toBe('plain');
            expect(Colors.isEnabled).toBe(false);
        } finally {
            Colors.enable();
        }
    });
});
