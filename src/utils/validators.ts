
/**
 * CONSTANTS
 */

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

export const validateDirectory = (input: string): string | undefined => {
    const trimmed = input.trim();
    if (!trimmed) return STRINGS.required;

    if (SPACES_RE.test(trimmed)) return STRINGS.noSpaces;
    if (INVALID_CHARS_RE.test(trimmed)) return STRINGS.invalidChars;

    return undefined;
};

export const validateGlobInput = (input: string): string | undefined => {
    const trimmed = input.trim();

    if (!trimmed) return STRINGS.required;
    if (EMPTY_GLOB_RE.test(trimmed)) return STRINGS.emptyGlob;

    return undefined;
};
