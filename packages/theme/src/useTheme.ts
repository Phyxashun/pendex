//
// SINGLE RESPONSIBILITY: the chaining/composition *mechanism* — turning a
// flat DefaultTheme object into a chainable, callable API via a Proxy.
// This file has no idea what colors mean (that's ThemePalette.ts); it
// only knows how to stack style functions and resolve them to a string.
// It's the piece that already does what the rest of this refactor is
// chasing — favoring composition over inheritance — so it's left
// structurally as-is, just relocated out of the file that used to also
// hold the palette data.

import type { DefaultTheme, DefaultThemeKeys } from './ThemePalette';

/**
 * THEME INTERFACE
 * Hybrid structure matching
 *  - string
 *  - direct text constructor function
 *  - recursive chain attributes
 */
export interface ChainableTheme {
    (txt?: string): ChainableTheme & string;

    // Semantic Utilities
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
    pill: ChainableTheme & string;
    title: ChainableTheme & string;
    subtitle: ChainableTheme & string;

    // Additional Styling Functionality
    color: ChainableTheme & string;
    backgroundColor: ChainableTheme & string;
    bold: ChainableTheme & string;
    italic: ChainableTheme & string;
    textDecoration: ChainableTheme & string;
    textTransform: ChainableTheme & string;

    toString(): string;
}

export type Theme = ChainableTheme & string;

/** Builds a chainable, composable Theme from a flat DefaultTheme. */
export const useTheme = (activeTheme: DefaultTheme, initialTxt: string = '', pendingStyles: DefaultThemeKeys = []): Theme => {
    // Computes styles on the text whenever string conversion is triggered or new text is supplied
    const compile = (textToStyle: string): string => {
        return pendingStyles.reduce((result, styleKey) => activeTheme[styleKey](result), textToStyle);
    };

    // The handler function allows calling the chain instance like a function: theme('TEXT') or theme.bold('TEXT')
    const targetFunction = (txt?: string) => {
        const textToProcess = txt || initialTxt || '';
        const compiledText = compile(textToProcess);

        // Return a fresh theme node so operations can keep chaining off the outcome
        return useTheme(activeTheme, compiledText, []);
    };

    return new Proxy(targetFunction, {
        get(_, prop) {
            // These symbols/methods intercept conversions to primitives (strings) automatically
            if (prop === 'toString' || prop === 'valueOf' || prop === Symbol.toPrimitive) {
                return () => compile(initialTxt);
            }

            if (prop in activeTheme) {
                const styleKey = prop as keyof DefaultTheme;

                // If text is already present, apply style eagerly; otherwise, stack it up
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
