/**
 * @module validators
 *
 * Small, pure input validators for interactive prompts (directory
 * paths, glob-list strings). Each returns an error message string when
 * invalid, or `undefined` when the input is acceptable — the shape
 * `@clack/prompts`' `validate` option expects.
 */

/**
 * CONSTANTS
 */

/** User-facing validation error messages. */
const STRINGS = {
    required: 'This field is required and cannot be left blank.',
    noSpaces: 'Spaces are not allowed in directory path names.',
    invalidChars: 'Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).',
    emptyGlob: 'Glob lists cannot contain completely blank strings.',
} as const;

const SPACES_RE = /\s/;
const INVALID_CHARS_RE = /[<>:"|?*]/;
const EMPTY_GLOB_RE = /(^\s*,|,\s*,|,\s*$)/;

/**
 * MAIN FUNCTIONS
 */

/**
 * Validates a directory path input: non-blank, no spaces, no illegal
 * path symbols.
 *
 * @param input - Raw user input to validate.
 * @returns An error message if invalid, or `undefined` if valid.
 */
export const validateDirectory = (input: string): string | undefined => {
    const trimmed = input.trim();
    if (!trimmed) return STRINGS.required;

    if (SPACES_RE.test(trimmed)) return STRINGS.noSpaces;
    if (INVALID_CHARS_RE.test(trimmed)) return STRINGS.invalidChars;

    return undefined;
};

/**
 * Validates a comma-separated glob-list input: non-blank, no
 * completely empty entries between commas.
 *
 * @param input - Raw user input to validate.
 * @returns An error message if invalid, or `undefined` if valid.
 */
export const validateGlobInput = (input: string): string | undefined => {
    const trimmed = input.trim();

    if (!trimmed) return STRINGS.required;
    if (EMPTY_GLOB_RE.test(trimmed)) return STRINGS.emptyGlob;

    return undefined;
};
