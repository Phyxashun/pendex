// FILE-PATH: packages/color/tests/color.test.ts
//
// oxlint-disable typescript/no-explicit-any
//
/**
 * @file packages/color/tests/color.test.ts
 * @description Unit test suite for internal color utilities, detection logic, SGR modifiers,
 * truecolor ANSI parsing, and runtime robustness across the `@pendex/color` package.
 */

import { afterEach, describe, expect, test } from 'bun:test';

import {
    bg,
    Colors,
    detectColorSupport,
    ESC,
    fg,
    parseHex,
    style,
    type StyleFactory,
    type Styler,
} from '../src';

describe('Colors Class', (): void => {
    // Save original state of environment variables & stdout
    const originalEnv = { ...Bun.env };
    const originalStdoutTTY: boolean | undefined = process.stdout?.isTTY;

    afterEach((): void => {
        // Restore environment variables and settings after each test
        for (const key in Bun.env) {
            delete Bun.env[key];
        }

        Object.assign(Bun.env, originalEnv);

        if (process.stdout) {
            Object.defineProperty(process.stdout, 'isTTY', {
                value: originalStdoutTTY,
                configurable: true,
            });
        }

        Colors.enable(); // Default back to enabled
    });

    // ==========================================
    // ⚙️ Environment Detection & State Controls
    // ==========================================
    test('should successfully test internal color functions', (): void => {
        const enabled: boolean = detectColorSupport();
        expect(enabled).toBe(true);

        const myStyle: Styler = style(`${ESC}31m`, `${ESC}39m`);
        const myStyleResult: string = myStyle('Test');
        expect(myStyleResult).toBe(`${ESC}31mTest${ESC}39m`);

        const newStyle: StyleFactory = (
            open: string,
            close: string,
        ): Styler => {
            return (text: string): string => {
                if (!enabled) return text;

                // Handle cases where runtime data does not match TypeScript types
                if (typeof text !== 'string') {
                    return `${open}${String(text ?? '').replaceAll(close, open)}${close}`;
                }

                return `${open}${text.replaceAll(close, open)}${close}`;
            };
        };
        const starStyle: Styler = newStyle('*', '*');
        const starResult: string = starStyle('STARS');
        expect(starResult).toBe(`*STARS*`);

        const redFgStyler: Styler = fg(31);
        expect(redFgStyler('Test')).toBe(`${ESC}31mTest${ESC}39m`);

        const redBgStyler: Styler = bg(41);
        expect(redBgStyler('Test')).toBe(`${ESC}41mTest${ESC}49m`);

        const [r, g, b] = parseHex('#ff8800');
        expect(r).toBe(255);
        expect(g).toBe(136);
        expect(b).toBe(0);

        const customOrange: Styler = Colors.hex('#ff8800');
        expect(customOrange('Orange')).toBe(
            `${ESC}38;2;255;136;0mOrange${ESC}39m`,
        );
    });

    test('should honor NO_COLOR convention', (): void => {
        delete Bun.env.FORCE_COLOR;
        Bun.env.NO_COLOR = '1';

        Colors.disable();
        expect(Colors.isEnabled).toBe(false);
    });

    test('should honor FORCE_COLOR when set to non-zero values', (): void => {
        Bun.env.FORCE_COLOR = '1';
        Colors.enable();
        expect(Colors.isEnabled).toBe(true);
    });

    test('should respect manual enablement and disablement', (): void => {
        Colors.disable();
        expect(Colors.isEnabled).toBe(false);
        expect(Colors.red('text')).toBe('text');

        Colors.enable();
        expect(Colors.isEnabled).toBe(true);
        expect(Colors.red('text')).toBe('\x1b[31mtext\x1b[39m');
    });

    // ==========================================
    // 🎨 Standard Stylers
    // ==========================================

    test('should apply SGR modifiers correctly', (): void => {
        Colors.enable();
        expect(Colors.reset('text')).toBe('\x1b[0mtext\x1b[0m');
        expect(Colors.bold('text')).toBe('\x1b[1mtext\x1b[22m');
        expect(Colors.dim('text')).toBe('\x1b[2mtext\x1b[22m');
        expect(Colors.italic('text')).toBe('\x1b[3mtext\x1b[23m');
        expect(Colors.underline('text')).toBe('\x1b[4mtext\x1b[24m');
        expect(Colors.inverse('text')).toBe('\x1b[7mtext\x1b[27m');
        expect(Colors.strikethrough('text')).toBe('\x1b[9mtext\x1b[29m');
    });

    test('should apply foreground colors correctly', (): void => {
        Colors.enable();
        expect(Colors.black('text')).toBe('\x1b[30mtext\x1b[39m');
        expect(Colors.red('text')).toBe('\x1b[31mtext\x1b[39m');
        expect(Colors.green('text')).toBe('\x1b[32mtext\x1b[39m');
        expect(Colors.yellow('text')).toBe('\x1b[33mtext\x1b[39m');
        expect(Colors.blue('text')).toBe('\x1b[34mtext\x1b[39m');
        expect(Colors.magenta('text')).toBe('\x1b[35mtext\x1b[39m');
        expect(Colors.cyan('text')).toBe('\x1b[36mtext\x1b[39m');
        expect(Colors.white('text')).toBe('\x1b[37mtext\x1b[39m');
    });

    test('should apply bright foreground colors correctly', (): void => {
        Colors.enable();
        expect(Colors.gray('text')).toBe('\x1b[90mtext\x1b[39m');
        expect(Colors.blackBright('text')).toBe('\x1b[90mtext\x1b[39m');
        expect(Colors.redBright('text')).toBe('\x1b[91mtext\x1b[39m');
        expect(Colors.greenBright('text')).toBe('\x1b[92mtext\x1b[39m');
        expect(Colors.yellowBright('text')).toBe('\x1b[93mtext\x1b[39m');
        expect(Colors.blueBright('text')).toBe('\x1b[94mtext\x1b[39m');
        expect(Colors.magentaBright('text')).toBe('\x1b[95mtext\x1b[39m');
        expect(Colors.cyanBright('text')).toBe('\x1b[96mtext\x1b[39m');
        expect(Colors.whiteBright('text')).toBe('\x1b[97mtext\x1b[39m');
    });

    test('should apply background colors correctly', (): void => {
        Colors.enable();
        expect(Colors.bgBlack('text')).toBe('\x1b[40mtext\x1b[49m');
        expect(Colors.bgRed('text')).toBe('\x1b[41mtext\x1b[49m');
        expect(Colors.bgGreen('text')).toBe('\x1b[42mtext\x1b[49m');
        expect(Colors.bgYellow('text')).toBe('\x1b[43mtext\x1b[49m');
        expect(Colors.bgBlue('text')).toBe('\x1b[44mtext\x1b[49m');
        expect(Colors.bgMagenta('text')).toBe('\x1b[45mtext\x1b[49m');
        expect(Colors.bgCyan('text')).toBe('\x1b[46mtext\x1b[49m');
        expect(Colors.bgWhite('text')).toBe('\x1b[47mtext\x1b[49m');
    });

    test('should apply bright background colors correctly', (): void => {
        Colors.enable();
        expect(Colors.bgBlackBright('text')).toBe('\x1b[100mtext\x1b[49m');
        expect(Colors.bgRedBright('text')).toBe('\x1b[101mtext\x1b[49m');
        expect(Colors.bgGreenBright('text')).toBe('\x1b[102mtext\x1b[49m');
        expect(Colors.bgYellowBright('text')).toBe('\x1b[103mtext\x1b[49m');
        expect(Colors.bgBlueBright('text')).toBe('\x1b[104mtext\x1b[49m');
        expect(Colors.bgMagentaBright('text')).toBe('\x1b[105mtext\x1b[49m');
        expect(Colors.bgCyanBright('text')).toBe('\x1b[106mtext\x1b[49m');
        expect(Colors.bgWhiteBright('text')).toBe('\x1b[107mtext\x1b[49m');
    });

    // ==========================================
    // 🎨 Truecolor (24-bit Hex)
    // ==========================================

    test('should parse and apply 6-digit hex colors with and without hash', (): void => {
        Colors.enable();
        const fgHexWithHash: Styler = Colors.hex('#ff8800');
        const fgHexWithoutHash: Styler = Colors.hex('ff8800');

        expect(fgHexWithHash('truecolor')).toBe(
            '\x1b[38;2;255;136;0mtruecolor\x1b[39m',
        );
        expect(fgHexWithoutHash('truecolor')).toBe(
            '\x1b[38;2;255;136;0mtruecolor\x1b[39m',
        );

        const bgHexWithHash: Styler = Colors.bgHex('#00ff88');
        expect(bgHexWithHash('truecolor')).toBe(
            '\x1b[48;2;0;255;136mtruecolor\x1b[49m',
        );
    });

    test('should parse and expand 3-digit shorthand hex colors', (): void => {
        Colors.enable();
        const fgShorthand: Styler = Colors.hex('#f80');
        expect(fgShorthand('shorthand')).toBe(
            '\x1b[38;2;255;136;0mshorthand\x1b[39m',
        );
    });

    test('should throw an error for invalid hex color values', (): void => {
        expect((): void => {
            Colors.hex('#invalid');
        }).toThrow('Colors: invalid hex color "#invalid"');
        expect((): void => {
            Colors.hex('1234567');
        }).toThrow('Colors: invalid hex color "1234567"');
        expect((): void => {
            Colors.hex('12');
        }).toThrow('Colors: invalid hex color "12"');
    });

    test('should instantiate a new Colors object', (): void => {
        //@ts-expect-error
        const MyColors: Colors = new (Colors as unknown)();

        expect(MyColors).toBeInstanceOf(Colors);
    });
});
