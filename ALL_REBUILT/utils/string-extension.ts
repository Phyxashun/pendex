export const { Colors } = await import('@pendex/color');

export const SEPARATOR = '/';
export const PATH_SEPARATOR_REGEX = /\\/g;
export const CONSECUTIVE_SLASH_REGEX = /(?<!^)(?<!\b[a-zA-Z]{2,}:)\/{2,}/g;

export type Segment = string | number;
export type PathSegment = Segment | false | undefined | null;

// Declare as new String method
declare global {
    interface String {
        toPosixPath(): string;
        normalizePath(): string;
        joinPath(...segments: PathSegment[]): string;
        label(): string;
        red(): string;
        green(): string;
    }
}

/**
 * Converts a path to POSIX-style forward slashes.
 *
 * @param this - Path to convert.
 * @returns `this` with all backslashes replaced by forward slashes.
 */
String.prototype.toPosixPath = function (this: string): string {
    return this.replace(PATH_SEPARATOR_REGEX, SEPARATOR);
};

/**
 * Normalizes all slashes to a standard web-safe format.
 * Exported so other modules can validate untrusted raw config string inputs.
 *
 * @param this - Path to convert.
 * @returns `this` with all double forward slashes replaced by single
 *  forward slashes.
 */
String.prototype.normalizePath = function (this: string): string {
    return this.toPosixPath().replace(CONSECUTIVE_SLASH_REGEX, SEPARATOR);
};

/**
 * Joins path segments with a single SEPARATOR, collapsing accidental doubles.
 * Adjusted signature to safely accept and drop falsy conditional values.
 *
 * @param segments - Path segments to join; falsy segments are dropped.
 * @returns The joined path.
 */
String.prototype.joinPath = function (...segments: PathSegment[]): string {
    const allSegments = [this, ...segments].filter(Boolean) as Segment[];

    // Convert each segment to a posix path
    const posixPath = allSegments
        .map(segment => String(segment).toPosixPath())
        .join(SEPARATOR);

    // Normalize entire combined string
    return posixPath.normalizePath();
};

String.prototype.label = function (this: string): string {
    return Colors.cyan(this);
};

String.prototype.red = function (this: string): string {
    return Colors.red(this);
};

String.prototype.green = function (this: string): string {
    return Colors.green(this);
};
