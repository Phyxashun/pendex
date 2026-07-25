//
// SINGLE RESPONSIBILITY: turning text into ANSI-styled text. Drop-in
// replacement for picocolors — same call shape (Colors.red('x'),
// Colors.bold('x'), Colors.bgMagenta('x')) — plus what picocolors can't
// do and the TOML theme system needs: 24-bit truecolor via Colors.hex()
// and Colors.bgHex(). This is the ONLY file in the codebase that knows
// what an escape code is; ThemeManager/ThemePalette build semantics on
// top of it and useTheme composes those — three layers, one job each.

/** A function that wraps text in ANSI styling. */
export type Styler = (text: string) => string;

const ESC = '\x1b[';

/** NO_COLOR/FORCE_COLOR conventions + TTY check, resolved once at load. */
const detectColorSupport = (): boolean => {
    const env = Bun.env;
    if ('NO_COLOR' in env) return false;
    if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true;
    return process.stdout?.isTTY === true;
};

let enabled = detectColorSupport();

/**
 * Builds a styler for an open/close code pair. Like picocolors, any
 * occurrence of the close code inside the text is replaced with the
 * open code so nested styles of the same family survive.
 */
const style = (open: string, close: string): Styler => {
    return (text: string): string => {
        if (!enabled) return text;

        // Handle cases where runtime data does not match TypeScript types
        if (typeof text !== 'string') {
            return `${open}${String(text ?? '').replaceAll(close, open)}${close}`;
        }

        return `${open}${text.replaceAll(close, open)}${close}`;
    };
};

const fg = (code: number): Styler => style(`${ESC}${code}m`, `${ESC}39m`);
const bg = (code: number): Styler => style(`${ESC}${code}m`, `${ESC}49m`);

/** Parses '#rgb' or '#rrggbb' (leading # optional) into [r, g, b]. */
const parseHex = (hex: string): [number, number, number] => {
    let value = hex.startsWith('#') ? hex.slice(1) : hex;
    if (value.length === 3) {
        value = value.split('').map(ch => ch + ch).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
        throw new Error(`Colors: invalid hex color "${hex}"`);
    }
    const num = parseInt(value, 16);
    return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

export class Colors {
    /** For tests and explicit overrides; detection runs once at module load. */
    static get isEnabled(): boolean { return enabled; }
    static enable(): void { enabled = true; }
    static disable(): void { enabled = false; }

    // Modifiers
    static readonly reset: Styler = style(`${ESC}0m`, `${ESC}0m`);
    static readonly bold: Styler = style(`${ESC}1m`, `${ESC}22m`);
    static readonly dim: Styler = style(`${ESC}2m`, `${ESC}22m`);
    static readonly italic: Styler = style(`${ESC}3m`, `${ESC}23m`);
    static readonly underline: Styler = style(`${ESC}4m`, `${ESC}24m`);
    static readonly inverse: Styler = style(`${ESC}7m`, `${ESC}27m`);
    static readonly strikethrough: Styler = style(`${ESC}9m`, `${ESC}29m`);

    // Standard foreground
    static readonly black: Styler = fg(30);
    static readonly red: Styler = fg(31);
    static readonly green: Styler = fg(32);
    static readonly yellow: Styler = fg(33);
    static readonly blue: Styler = fg(34);
    static readonly magenta: Styler = fg(35);
    static readonly cyan: Styler = fg(36);
    static readonly white: Styler = fg(37);

    // Bright foreground
    static readonly gray: Styler = fg(90);
    static readonly blackBright: Styler = fg(90);
    static readonly redBright: Styler = fg(91);
    static readonly greenBright: Styler = fg(92);
    static readonly yellowBright: Styler = fg(93);
    static readonly blueBright: Styler = fg(94);
    static readonly magentaBright: Styler = fg(95);
    static readonly cyanBright: Styler = fg(96);
    static readonly whiteBright: Styler = fg(97);

    // Standard background
    static readonly bgBlack: Styler = bg(40);
    static readonly bgRed: Styler = bg(41);
    static readonly bgGreen: Styler = bg(42);
    static readonly bgYellow: Styler = bg(43);
    static readonly bgBlue: Styler = bg(44);
    static readonly bgMagenta: Styler = bg(45);
    static readonly bgCyan: Styler = bg(46);
    static readonly bgWhite: Styler = bg(47);

    // Bright background
    static readonly bgBlackBright: Styler = bg(100);
    static readonly bgRedBright: Styler = bg(101);
    static readonly bgGreenBright: Styler = bg(102);
    static readonly bgYellowBright: Styler = bg(103);
    static readonly bgBlueBright: Styler = bg(104);
    static readonly bgMagentaBright: Styler = bg(105);
    static readonly bgCyanBright: Styler = bg(106);
    static readonly bgWhiteBright: Styler = bg(107);

    /** 24-bit truecolor foreground from a hex string — what TOML themes are built on. */
    static hex(hexColor: string): Styler {
        const [r, g, b] = parseHex(hexColor);
        return style(`${ESC}38;2;${r};${g};${b}m`, `${ESC}39m`);
    }

    /** 24-bit truecolor background from a hex string. */
    static bgHex(hexColor: string): Styler {
        const [r, g, b] = parseHex(hexColor);
        return style(`${ESC}48;2;${r};${g};${b}m`, `${ESC}49m`);
    }
}
