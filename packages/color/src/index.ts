// FILE-PATH: packages/color/src/index.ts

/**
 * @module @pendex/color
 *
 * Public entry point for the `@pendex/color` package. Re-exports
 * {@link Colors}, the ANSI text-styling namespace, and the
 * {@link Styler} function type it is built from.
 */

export {
    Colors,
    ESC,
    bg,
    detectColorSupport,
    fg,
    parseHex,
    style,
    type BooleanFn,
    type CodeStyleFactory,
    type HexStringParser,
    type StyleFactory,
    type Styler,
    type Tuple,
} from './Colors';
