/**
 * @module useTheme
 *
 * Single responsibility: the chaining/composition *mechanism* — turning a
 * flat {@link DefaultTheme} object into a chainable, callable API via a
 * `Proxy`. This file has no idea what colors mean (that's
 * `ThemePalette.ts`); it only knows how to stack style functions and
 * resolve them to a string. It's the piece that already does what the
 * rest of this refactor is chasing — favoring composition over
 * inheritance — so it's left structurally as-is, just relocated out of
 * the file that used to also hold the palette data.
 */

import type { DefaultTheme, DefaultThemeKeys } from './ThemePalette';

/**
 * Hybrid structure matching:
 * - a string (via `toString`/`valueOf`/`Symbol.toPrimitive`)
 * - a direct text constructor function (`theme('text')`)
 * - recursive chain attributes (`theme.bold.primary('text')`)
 *
 * @example
 * ```ts
 * const theme: Theme = useTheme(defaultTheme);
 * String(theme.bold.primary('Hello')); // bold + primary-colored "Hello"
 * ```
 */
export interface ChainableTheme {
    (txt?: string): ChainableTheme & string;

    // Semantic Utilities
    /** @category Semantic Utilities */
    primary: ChainableTheme & string;
    secondary: ChainableTheme & string;
    success: ChainableTheme & string;
    warning: ChainableTheme & string;
    error: ChainableTheme & string;
    info: ChainableTheme & string;
    muted: ChainableTheme & string;
    foreground: ChainableTheme & string;
    background: ChainableTheme & string;
    titleBg: ChainableTheme & string;

    // Typography Styles
    /** @category Typography Styles */
    pill: ChainableTheme & string;
    /** @category Typography Styles */
    title: ChainableTheme & string;
    /** @category Typography Styles */
    subtitle: ChainableTheme & string;

    // Additional Styling Functionality
    /** @category Additional Styling Functionality */
    color: ChainableTheme & string;
    /** @category Additional Styling Functionality */
    backgroundColor: ChainableTheme & string;
    /** @category Additional Styling Functionality */
    bold: ChainableTheme & string;
    /** @category Additional Styling Functionality */
    italic: ChainableTheme & string;
    /** @category Additional Styling Functionality */
    textDecoration: ChainableTheme & string;
    /** @category Additional Styling Functionality */
    textTransform: ChainableTheme & string;

    /** Resolves the accumulated chain to a plain styled string. */
    toString(): string;
}

/**
 * A {@link ChainableTheme} that also behaves as a plain string.
 */
export type Theme = ChainableTheme & string;

/**
 * Builds a chainable, composable {@link Theme} from a flat
 * {@link DefaultTheme}. Each property access returns a new proxied
 * `Theme` node so styles can be stacked (`theme.bold.primary`) before
 * being applied to text, either by calling the chain (`theme('text')`)
 * or by coercing it to a string.
 *
 * @param activeTheme - The flat, already-resolved theme whose styler
 *  functions back this chain.
 * @param initialTxt - Text already accumulated in the chain (internal
 *  recursion state).
 * @param pendingStyles - Style keys queued to apply once text is
 *  supplied (internal recursion state).
 * @returns A {@link Theme} proxy supporting both function-call and
 *  chained-property styling.
 */
export const useTheme = (
    activeTheme: DefaultTheme,
    initialTxt: string = '',
    pendingStyles: DefaultThemeKeys = []
): Theme => {
    // Computes styles on the text whenever string
    // conversion is triggered or new text is supplied
    const compile = (textToStyle: string): string => {
        return pendingStyles.reduce((result, styleKey) =>
            activeTheme[styleKey](result), textToStyle);
    };

    // The handler function allows calling the chain
    // instance like a function: theme('TEXT') or
    // theme.bold('TEXT')
    const targetFunction = (txt?: string) => {
        const textToProcess = txt || initialTxt || '';
        const compiledText = compile(textToProcess);

        // Return a fresh theme node so operations can
        // keep chaining off the outcome
        return useTheme(activeTheme, compiledText, []);
    };

    return new Proxy(targetFunction, {
        get(_, prop) {
            // These symbols/methods intercept conversions
            // to primitives (strings) automatically
            if (prop === 'toString' || prop === 'valueOf' || prop === Symbol.toPrimitive) {
                return () => compile(initialTxt);
            }

            if (prop in activeTheme) {
                const styleKey = prop as keyof DefaultTheme;

                // If text is already present, apply style eagerly;
                // otherwise, stack it up
                if (initialTxt) {
                    const nextText = activeTheme[styleKey](initialTxt);
                    return useTheme(activeTheme, nextText, pendingStyles);
                }

                return useTheme(activeTheme, initialTxt, [...pendingStyles, styleKey]);
            }
            return undefined;
        },
    }) as unknown as Theme;
};
