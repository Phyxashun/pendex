import process from 'node:process';
import type { Writable } from 'node:stream';
import { styleText } from 'node:util';

import { getColumns, settings } from '@clack/core';

import stringWidth from 'fast-string-width';
import { wrapAnsi } from 'fast-wrap-ansi';

const S_BAR = '│';
const S_BAR_H = '─';
const S_CONNECT_LEFT = '├';
const S_CORNER_BOTTOM_LEFT = '└';
const S_CORNER_BOTTOM_RIGHT = '┘';
const S_CORNER_TOP_RIGHT = '┐';
const S_ERROR_SQUARE = '■';

type FormatFn = (line: string) => string;
export interface NoteOptions {
    output?: Writable;
    withGuide?: boolean;
    format?: FormatFn;
}

const defaultNoteFormatter = (line: string): string => line;

const wrapWithFormat = (
    message: string,
    width: number,
    format: FormatFn,
): string => {
    const opts = {
        hard: true,
        trim: false,
    };
    const wrapMsg = wrapAnsi(message, width, opts).split('\n');
    const maxWidthNormal = wrapMsg.reduce(
        (sum: number, ln: number) => Math.max(stringWidth(ln), sum),
        0,
    );
    const maxWidthFormat = wrapMsg
        .map(format)
        .reduce((sum: number, ln: number) => Math.max(stringWidth(ln), sum), 0);
    const wrapWidth = width - (maxWidthFormat - maxWidthNormal);
    return wrapAnsi(message, wrapWidth, opts);
};

export const errorNote = (
    message = '',
    title = 'Error Details',
    opts?: NoteOptions,
) => {
    const output: Writable = opts?.output ?? process.stdout;
    const hasGuide = opts?.withGuide ?? settings.withGuide;
    const format = opts?.format ?? defaultNoteFormatter;

    // Dynamically measure wrap length bounds against user's CLI width
    const wrapMsg = wrapWithFormat(message, getColumns(output) - 6, format);
    const lines = ['', ...wrapMsg.split('\n').map(format), ''];
    const titleLen = stringWidth(title);

    const len =
        Math.max(
            lines.reduce((sum, ln) => {
                const width = stringWidth(ln);
                return width > sum ? width : sum;
            }, 0),
            titleLen,
        ) + 2;

    const msg = lines
        .map(
            ln =>
                `${styleText('gray', S_BAR)}  ${ln}${' '.repeat(len - stringWidth(ln))}${styleText('gray', S_BAR)}`,
        )
        .join('\n');

    const leadingBorder = hasGuide ? `${styleText('gray', S_BAR)}\n` : '';
    const bottomLeft = hasGuide ? S_CONNECT_LEFT : S_CORNER_BOTTOM_LEFT;

    output.write(
        `${leadingBorder}${styleText('red', S_ERROR_SQUARE)} ${styleText('red', title)} ${styleText(
            'gray',
            S_BAR_H.repeat(Math.max(len - titleLen - 1, 1)) +
                S_CORNER_TOP_RIGHT,
        )}\n${msg}\n${styleText('gray', bottomLeft + S_BAR_H.repeat(len + 2) + S_CORNER_BOTTOM_RIGHT)}\n`,
    );
};
