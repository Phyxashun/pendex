// FILE-PATH: packages/core/src/ArchiveFormat.ts
//
/**
 * @module ArchiveFormat
 *
 * Single responsibility: the on-disk shape of a Pendex archive — both
 * directions, one file.
 *
 * NO TEARLINE. Entries are delimited by their banner frames alone; the
 * old TEARLINE separator was redundant given that every entry already
 * begins and ends with a structurally recognizable 6-line frame. Parsing
 * is a small state machine: find a START frame, then scan for the END
 * frame whose PATH line matches the START frame's path, and take
 * everything between verbatim. Path-matching the END frame is what makes
 * this MORE robust than the tearline was: an archived archive's inner
 * entries carry inner paths, so their frames can never falsely terminate
 * an outer entry — full self-hosting round-trips byte-perfect. Garbage
 * between entries and unterminated frames are skipped, never fatal.
 *
 * CONTENT IS PRESERVED VERBATIM. The single '\n' on each side of the
 * content belongs to the frame; slice + join is exact, so trailing
 * newlines, empty files, leading whitespace, and CRLF endings all
 * round-trip byte-for-byte.
 */

import { baseName, extName, joinPath, normalizePath } from './Constants';

const WIDTH = 40;
const CUBE = '■';
const COMMENT = '//';

// Number of lines buildBanner() emits. The parser recognizes
// frames by this shape.
const BANNER_LINE_COUNT = 6;
// Zero-based index of the `// PATH     :` line inside a banner.
const PATH_LINE_INDEX = 3;

// Literal prefix of a banner's path line, used both to build
// and to recognize it.
const PATH_LINE_PREFIX = '// PATH     :';
// Tag marking the start of an archived-file frame.
const START_TAG = '-< START >-';
// Tag marking the end of an archived-file frame.
const END_TAG = '-<  END  >-';

/**
 * One file recovered from an archive: its original path and verbatim content.
 */
export interface ArchivedFile {
    // The file's original path as recorded in its banner.
    readonly originalPath: string;
    // The file's content, preserved byte-for-byte.
    readonly content: string;
}

/**
 * Builds a 6-line banner frame (start or end) for a file.
 *
 * @param filePath - Original path of the file being framed.
 * @param tag - Either {@link START_TAG} or {@link END_TAG}.
 * @returns The banner text, exactly {@link BANNER_LINE_COUNT} lines
 *  joined with `\n`.
 */
function buildBanner(
    filePath: string,
    tag: typeof START_TAG | typeof END_TAG,
): string {
    const spacer = CUBE.repeat(WIDTH);
    const extension = extName(filePath).toUpperCase().replace('.', '') || 'TXT';

    // NOTE: exactly BANNER_LINE_COUNT lines, with the PATH line at
    // PATH_LINE_INDEX — the parser's frame recognition depends on this.
    return [
        `${COMMENT}${spacer}${tag}${spacer}`,
        `${COMMENT} FILE NAME: : ${baseName(filePath)} `,
        `${COMMENT} TYPE     : .${extension}`,
        `${COMMENT} PATH     : ${filePath.replace(/\\/g, '/')}`,
        `${COMMENT} PROCESSED: ${new Date().toISOString()}`,
        `${COMMENT}${spacer}${tag}${spacer}`,
    ].join('\n');
}

/**
 * True when a full banner frame with the given tag starts at lines[index].
 *
 * @param lines - The full text, split into lines.
 * @param index - Index in `lines` where the frame is expected to start.
 * @param tag - The frame tag to match ({@link START_TAG} or {@link END_TAG}).
 * @returns Whether a complete, correctly-shaped frame starts at `index`.
 */
function isFrame(lines: string[], index: number, tag: string): boolean {
    return (
        index + BANNER_LINE_COUNT - 1 < lines.length &&
        (lines[index] ?? '').includes(tag) &&
        (lines[index + BANNER_LINE_COUNT - 1] ?? '').includes(tag) &&
        (lines[index + PATH_LINE_INDEX] ?? '').startsWith(PATH_LINE_PREFIX)
    );
}

/**
 * Extracts the path from a `// PATH     : <path>` line, or null.
 *
 * @param line - The candidate path line (or `undefined`).
 * @returns The extracted path, or `null` if `line` is missing or blank.
 */
function extractPath(line: string | undefined): string | null {
    if (!line) return null;
    // slice past the first colon only — keeps paths containing ':' intact.
    const path = line.slice(line.indexOf(':') + 1).trim();
    return path || null;
}

/**
 * Wraps one file's content in its start/end banner for archiving.
 * The content is embedded verbatim — no trimming — so what goes in is
 * exactly what parseArchive() gives back.
 *
 * @param filePath - Original path of the file being archived.
 * @param content - The file's raw content, embedded verbatim.
 * @returns The complete archive entry text (start banner + content +
 *  end banner).
 */
export function buildArchiveEntry(filePath: string, content: string): string {
    return `${buildBanner(
        filePath,
        START_TAG,
    )}\n${content}\n${buildBanner(filePath, END_TAG)}`;
}

/**
 * Joins already-built archive entries into one job's .txt file body.
 * A blank line between entries is purely cosmetic — the parser keys on
 * banner frames, not separators.
 *
 * @param entries - Entries produced by {@link buildArchiveEntry}.
 * @returns The concatenated archive body.
 */
export function joinArchiveEntries(entries: string[]): string {
    return entries.join('\n\n');
}

/**
 * Recovers every archived file from a job's .txt body.
 *
 * State machine: on finding a START frame, scan forward for the END
 * frame whose PATH matches the START frame's path; everything between
 * is the content, verbatim. An END frame carrying a *different* path
 * (e.g. an inner entry of an archived archive) is treated as content.
 * Unterminated START frames and any text outside a frame pair are
 * skipped — corruption is localized, never fatal, and never throws.
 *
 * @param rawText - The full text of a job's archive file.
 * @returns Every successfully-parsed {@link ArchivedFile}, in document order.
 */
export function parseArchive(rawText: string): ArchivedFile[] {
    const lines = rawText.split('\n');
    const results: ArchivedFile[] = [];
    let i = 0;

    while (i < lines.length) {
        if (isFrame(lines, i, START_TAG)) {
            const path = extractPath(lines[i + PATH_LINE_INDEX]);
            if (path) {
                let j = i + BANNER_LINE_COUNT;
                let endIndex = -1;
                while (j <= lines.length - BANNER_LINE_COUNT) {
                    if (
                        isFrame(lines, j, END_TAG) &&
                        extractPath(lines[j + PATH_LINE_INDEX]) === path
                    ) {
                        endIndex = j;
                        break;
                    }
                    j++;
                }

                if (endIndex !== -1) {
                    results.push({
                        originalPath: path,
                        content: lines
                            .slice(i + BANNER_LINE_COUNT, endIndex)
                            .join('\n'),
                    });
                    i = endIndex + BANNER_LINE_COUNT;
                    continue;
                }
            }
        }
        i++;
    }

    return results;
}

/**
 * Where one job's archive lives on disk for a given output directory.
 *
 * @param outputDir - Base directory compiled archives are written to.
 * @param filename - The job's output filename.
 * @returns The joined path to the job's archive file.
 */
export function archivePathFor(outputDir: string, filename: string): string {
    const normalizedPath = normalizePath(outputDir);
    return joinPath(normalizedPath, filename);
}
