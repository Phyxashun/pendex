/**
 * @module Colors
 *
 * Single responsibility: turning text into ANSI-styled text. Drop-in
 * replacement for picocolors — same call shape (`Colors.red('x')`,
 * `Colors.bold('x')`, `Colors.bgMagenta('x')`) — plus what picocolors can't
 * do and the TOML theme system needs: 24-bit truecolor via {@link Colors.hex}
 * and {@link Colors.bgHex}. This is the ONLY file in the codebase that knows
 * what an escape code is; `ThemeManager`/`ThemePalette` build semantics on
 * top of it and `useTheme` composes those — three layers, one job each.
 */

/** A function that wraps text in ANSI styling. */
export type Styler = (text: string) => string;

const ESC = '\x1b[';

/**
 * Determines whether ANSI color output should be enabled, honoring the
 * `NO_COLOR`/`FORCE_COLOR` conventions and falling back to a TTY check.
 * Resolved once at module load and cached in {@link enabled}.
 *
 * @returns `true` if color output should be enabled, `false` otherwise.
 */
const detectColorSupport = (): boolean => {
    const env = Bun.env;
    if ('NO_COLOR' in env) return false;
    if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true;
    return process.stdout?.isTTY === true;
};

/** Module-level flag controlling whether stylers emit ANSI codes. */
let enabled = detectColorSupport();

/**
 * Builds a styler for an open/close code pair. Like picocolors, any
 * occurrence of the close code inside the text is replaced with the
 * open code so nested styles of the same family survive.
 *
 * @param open - ANSI escape sequence that opens the style.
 * @param close - ANSI escape sequence that closes the style.
 * @returns A {@link Styler} that wraps input text in the given codes.
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

/**
 * Builds a standard-palette foreground {@link Styler} for a given SGR code.
 *
 * @param code - ANSI SGR foreground color code (e.g. 31 for red).
 * @returns A {@link Styler} for that foreground color.
 */
const fg = (code: number): Styler => style(`${ESC}${code}m`, `${ESC}39m`);

/**
 * Builds a standard-palette background {@link Styler} for a given SGR code.
 *
 * @param code - ANSI SGR background color code (e.g. 41 for red).
 * @returns A {@link Styler} for that background color.
 */
const bg = (code: number): Styler => style(`${ESC}${code}m`, `${ESC}49m`);

/**
 * Parses a hex color string into its RGB components.
 *
 * @param hex - A `'#rgb'` or `'#rrggbb'` string (leading `#` optional).
 * @returns A `[r, g, b]` tuple with each channel in the range 0-255.
 * @throws {Error} If `hex` is not a valid 3- or 6-digit hex color.
 */
const parseHex = (hex: string): [number, number, number] => {
    let value = hex.startsWith('#') ? hex.slice(1) : hex;
    if (value.length === 3) {
        value = value
            .split('')
            .map(ch => ch + ch)
            .join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
        throw new Error(`Colors: invalid hex color "${hex}"`);
    }
    const num = parseInt(value, 16);
    return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

/**
 * Static namespace of ANSI text stylers. A drop-in replacement for
 * picocolors, plus 24-bit truecolor support via {@link Colors.hex} and
 * {@link Colors.bgHex}. Every property returns a {@link Styler} — a
 * function that wraps a string in the corresponding ANSI codes, or
 * returns the string unchanged when color output is disabled (see
 * {@link Colors.isEnabled}).
 *
 * @example
 * ```ts
 * console.log(Colors.bold(Colors.red('error:')), 'something broke');
 * console.log(Colors.hex('#ff8800')('custom orange'));
 * ```
 */
export class Colors {
    /** Whether color output is currently enabled. For tests and explicit overrides; detection runs once at module load. */
    static get isEnabled(): boolean {
        return enabled;
    }
    /** Force-enables ANSI color output, overriding auto-detection. */
    static enable(): void {
        enabled = true;
    }
    /** Force-disables ANSI color output, overriding auto-detection. */
    static disable(): void {
        enabled = false;
    }

    /** @category Modifiers */
    static readonly reset: Styler = style(`${ESC}0m`, `${ESC}0m`);
    /** @category Modifiers */
    static readonly bold: Styler = style(`${ESC}1m`, `${ESC}22m`);
    /** @category Modifiers */
    static readonly dim: Styler = style(`${ESC}2m`, `${ESC}22m`);
    /** @category Modifiers */
    static readonly italic: Styler = style(`${ESC}3m`, `${ESC}23m`);
    /** @category Modifiers */
    static readonly underline: Styler = style(`${ESC}4m`, `${ESC}24m`);
    /** @category Modifiers */
    static readonly inverse: Styler = style(`${ESC}7m`, `${ESC}27m`);
    /** @category Modifiers */
    static readonly strikethrough: Styler = style(`${ESC}9m`, `${ESC}29m`);

    /** @category Standard foreground */
    static readonly black: Styler = fg(30);
    static readonly red: Styler = fg(31);
    static readonly green: Styler = fg(32);
    static readonly yellow: Styler = fg(33);
    static readonly blue: Styler = fg(34);
    static readonly magenta: Styler = fg(35);
    static readonly cyan: Styler = fg(36);
    static readonly white: Styler = fg(37);

    /** @category Bright foreground */
    static readonly gray: Styler = fg(90);
    static readonly blackBright: Styler = fg(90);
    static readonly redBright: Styler = fg(91);
    static readonly greenBright: Styler = fg(92);
    static readonly yellowBright: Styler = fg(93);
    static readonly blueBright: Styler = fg(94);
    static readonly magentaBright: Styler = fg(95);
    static readonly cyanBright: Styler = fg(96);
    static readonly whiteBright: Styler = fg(97);

    /** @category Standard background */
    static readonly bgBlack: Styler = bg(40);
    static readonly bgRed: Styler = bg(41);
    static readonly bgGreen: Styler = bg(42);
    static readonly bgYellow: Styler = bg(43);
    static readonly bgBlue: Styler = bg(44);
    static readonly bgMagenta: Styler = bg(45);
    static readonly bgCyan: Styler = bg(46);
    static readonly bgWhite: Styler = bg(47);

    /** @category Bright background */
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
