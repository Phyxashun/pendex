// FILE-PATH: src/utils/ToPdf.ts
//
import fontkit from '@pdf-lib/fontkit';
import {
    PageSizes,
    PDFDocument,
    PDFFont,
    PDFPage,
    rgb,
    type Color,
} from 'pdf-lib';

import type { BunFile } from 'bun';
import path from 'path';

import Prism, { Token } from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';

export interface PDFDimensions {
    width: number;
    height: number;
}

export type TextWidth = (text: string) => number;

export interface Config {
    fontSize?: number;
    lineHeight?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    fontFile?: string;
    textColor?: Color;
    textOpacity?: number;
    pageSize?: [number, number] | keyof typeof PageSizes;
    pageOrientation?: 'portrait' | 'landscape';
    wordWrap?: 'word' | 'char' | 'none';
    syntaxHighlighting?: boolean;
    language?: string;
    backgroundColor?: Color;
    // New option to force everything into a single, continuous vertical canvas page
    oneLongPage?: boolean;
}

export const DEFAULT_CONFIG: Required<Config> = {
    fontSize: 8,
    lineHeight: 12,
    marginTop: 50,
    marginBottom: 50,
    marginLeft: 50,
    marginRight: 50,
    fontFile:
        '../assets/JetBrainsMono/JetBrainsMonoNLNerdFontPropo-Regular.ttf',
    textColor: rgb(0.96, 0.96, 0.94),
    textOpacity: 1.0,
    pageSize: 'Letter',
    pageOrientation: 'portrait',
    wordWrap: 'word',
    syntaxHighlighting: true,
    language: 'typescript',
    backgroundColor: rgb(0.11, 0.12, 0.13),
    oneLongPage: false,
};

export const SYNTAX_THEME: Record<string, Color> = {
    keyword: rgb(0.97, 0.15, 0.45),
    string: rgb(0.65, 0.86, 0.4),
    comment: rgb(0.46, 0.48, 0.42),
    number: rgb(0.68, 0.51, 1.0),
    function: rgb(0.4, 0.85, 0.94),
    operator: rgb(0.97, 0.61, 0.12),
    punctuation: rgb(0.8, 0.8, 0.8),
    boolean: rgb(0.97, 0.61, 0.12),
    classname: rgb(0.4, 0.85, 0.94),
    plain: rgb(0.96, 0.96, 0.94),
};

export const NEWLINE: RegExp = /\r?\n/;

interface TextAtom {
    text: string;
    color: Color;
}

interface RenderableWrappedLine {
    atoms: TextAtom[];
    textStr: string;
}

// oxlint-disable-next-line typescript/no-duplicate-type-constituents
type ParseTokenFn = (token: string | Token, type?: string) => void;

export class ToPdfService {
    private readonly config: Required<Config>;

    constructor(config: Required<Config>) {
        this.config = config;
        if (this.config.syntaxHighlighting) {
            try {
                loadLanguages([this.config.language]);
            } catch (e: unknown) {
                if (e instanceof Error) {
                    console.warn(
                        `⚠️ [ToPdf Warning]: Could not load Prism definition for "${this.config.language}". Fallback 'clike' styling will be used. Error details: ${e.message}`,
                    );
                } else {
                    console.warn(
                        `⚠️ [ToPdf Warning]: Could not load Prism definition for "${this.config.language}". An unexpected error occurred. Fallback 'clike' styling will be used.`,
                    );
                }
            }
        }
    }

    // Adjusted to accept a dynamic custom height modifier parameter overrides
    private createPageWithLayout(
        pdfDoc: PDFDocument,
        customHeight?: number,
    ): PDFPage {
        // Destructure into explicit independent primitives to ensure no array reference mutations
        let [baseWidth, baseHeight] =
            typeof this.config.pageSize === 'string'
                ? PageSizes[this.config.pageSize]
                : this.config.pageSize;

        // Override vertical sizing immediately if computing a single long page strip
        if (customHeight !== undefined) {
            baseHeight = customHeight;
        }

        // Handle structural landscape orientation transformation BEFORE instantiating the canvas
        if (
            this.config.pageOrientation === 'landscape' &&
            customHeight === undefined
        ) {
            const temp: number = baseWidth;
            baseWidth = baseHeight;
            baseHeight = temp;
        }

        // Safely generate a flawlessly dimensioned canvas layout frame up front
        const page: PDFPage = pdfDoc.addPage([baseWidth, baseHeight]);
        const { width, height } = page.getSize();

        // Draw the solid background color wrapper safely matching the canvas bounds
        page.drawRectangle({
            x: 0,
            y: 0,
            width: width,
            height: height,
            color: this.config.backgroundColor,
        });

        return page;
    }

    public async convertToPdf(
        sourcePath: string,
        outputPath: string,
        fontPath: string = this.config.fontFile,
    ): Promise<void> {
        const textContent: string = await this.getText(sourcePath);
        const pdfDoc: PDFDocument = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const font: PDFFont = await this.getFontSafely(fontPath, pdfDoc);

        // Determine target content layout bounding widths up front
        let initialPageWidth: number;
        if (typeof this.config.pageSize === 'string') {
            initialPageWidth = PageSizes[this.config.pageSize][0];
        } else {
            initialPageWidth = this.config.pageSize[0];
        }
        if (
            this.config.pageOrientation === 'landscape' &&
            !this.config.oneLongPage
        ) {
            if (typeof this.config.pageSize === 'string') {
                initialPageWidth = PageSizes[this.config.pageSize][1];
            } else {
                initialPageWidth = this.config.pageSize[1];
            }
        }

        const maxLineWidth: number =
            initialPageWidth -
            (this.config.marginLeft + this.config.marginRight);

        /**
         * PRE-PROCESS TOKENS
         */
        const renderingLines: TextAtom[][] = [[]];
        let currentLineIdx: number = 0;

        // Normalize tabs globally up front to ensure character counts and widths match perfectly
        const cleanTextContent: string = textContent.replace(/\t/g, '    ');

        if (this.config.syntaxHighlighting) {
            const grammar =
                Prism.languages[this.config.language] || Prism.languages.clike;
            const globalTokens: (string | Token)[] = Prism.tokenize(
                cleanTextContent,
                grammar!,
            );

            const parseToken: ParseTokenFn = (
                token: string | Prism.Token,
                type?: string,
            ): void => {
                if (typeof token === 'string') {
                    const lines: string[] = token.split(/\r?\n/);
                    const tokenType: string = type ?? 'plain';
                    const activeColor: Color =
                        SYNTAX_THEME[tokenType] ?? this.config.textColor;

                    lines.forEach((lineText, index): void => {
                        if (index > 0) {
                            currentLineIdx++;
                            renderingLines[currentLineIdx] = [];
                        }
                        if (lineText.length > 0) {
                            renderingLines[currentLineIdx]!.push({
                                text: lineText,
                                color: activeColor,
                            });
                        }
                    });
                } else {
                    if (Array.isArray(token.content)) {
                        token.content.forEach(subToken =>
                            parseToken(subToken, token.type),
                        );
                    } else {
                        parseToken(token.content, token.type);
                    }
                }
            };
            globalTokens.forEach(token => parseToken(token));
        } else {
            const rawLines: string[] = cleanTextContent.split(/\r?\n/);
            rawLines.forEach((line, index): void => {
                renderingLines[index] = [
                    { text: line, color: this.config.textColor },
                ];
            });
        }

        /**
         * PRE-WRAPPING CALCULATIONS & MEASUREMENTS LAYER
         */
        const allFinalWrappedLines: RenderableWrappedLine[] = [];
        const textWidthFn: TextWidth = (text: string): number =>
            font.widthOfTextAtSize(text, this.config.fontSize);

        for (const rawLineAtoms of renderingLines) {
            const fullLineText: string = rawLineAtoms
                .map(atom => atom.text)
                .join('');

            // Get wrapped versions of strings
            const wrappedLineStrings: string[] = this.wrapText(
                fullLineText,
                maxLineWidth,
                textWidthFn,
            );

            let atomIndex: number = 0;
            let atomCharOffset: number = 0;

            for (const wrappedString of wrappedLineStrings) {
                const lineAtoms: TextAtom[] = [];

                // Reconstruct token highlighting context based on exactly what text wrap chose
                // Strip out structural wrap-injected space variants if wrapText shifts characters
                for (let i: number = 0; i < wrappedString.length; i++) {
                    if (atomIndex >= rawLineAtoms.length) break;

                    let currentAtom = rawLineAtoms[atomIndex];

                    // Safety logic: If wrap-injected characters (like added spaces) fall out of bounds
                    // with original source string layout, dynamically bridge using current token style
                    if (atomCharOffset >= currentAtom!.text.length) {
                        atomIndex++;
                        atomCharOffset = 0;
                        if (atomIndex >= rawLineAtoms.length) break;
                        currentAtom = rawLineAtoms[atomIndex];
                    }

                    const charToMatch = wrappedString[i];
                    const originalChar = currentAtom!.text[atomCharOffset];

                    // If characters align, safely build or extend current colored chunk
                    if (charToMatch === originalChar) {
                        const lastAtom = lineAtoms[lineAtoms.length - 1];
                        if (lastAtom && lastAtom.color === currentAtom!.color) {
                            lastAtom.text += charToMatch;
                        } else {
                            lineAtoms.push({
                                text: charToMatch!,
                                color: currentAtom!.color,
                            });
                        }
                        atomCharOffset++;
                    } else {
                        // Fallback for wrapped-injected layout white-space
                        const lastAtom = lineAtoms[lineAtoms.length - 1];
                        const fallbackColor: Color = lastAtom
                            ? lastAtom.color
                            : this.config.textColor;
                        if (lastAtom) {
                            lastAtom.text += charToMatch;
                        } else {
                            lineAtoms.push({
                                text: charToMatch!,
                                color: fallbackColor,
                            });
                        }
                    }
                }

                allFinalWrappedLines.push({
                    atoms: lineAtoms,
                    textStr: wrappedString,
                });
            }
        }

        /**
         * DYNAMIC CANVAS VS PAGINATION DISPATCH ROUTING
         */
        let page: PDFPage;
        let currentY: number;
        let pageHeight: number;
        const pageBottomThreshold: number = this.config.marginBottom;

        if (this.config.oneLongPage) {
            const contentHeight: number =
                allFinalWrappedLines.length * this.config.lineHeight;
            pageHeight =
                this.config.marginTop +
                contentHeight +
                this.config.marginBottom;

            page = this.createPageWithLayout(pdfDoc, pageHeight);
            currentY = pageHeight - this.config.marginTop;
        } else {
            page = this.createPageWithLayout(pdfDoc);
            pageHeight = page.getSize().height;
            currentY = pageHeight - this.config.marginTop;
        }

        /**
         * RENDER TO CANVAS SURFACE
         */
        for (const wrappedLine of allFinalWrappedLines) {
            if (
                !this.config.oneLongPage &&
                currentY - this.config.fontSize < pageBottomThreshold
            ) {
                page = this.createPageWithLayout(pdfDoc);
                currentY = page.getSize().height - this.config.marginTop;
            }

            let currentX: number = this.config.marginLeft;

            for (const chunk of wrappedLine.atoms) {
                if (chunk.text.length > 0) {
                    page.drawText(chunk.text, {
                        x: currentX,
                        y: currentY,
                        size: this.config.fontSize,
                        font: font,
                        color: chunk.color,
                        opacity: this.config.textOpacity,
                    });
                    currentX += font.widthOfTextAtSize(
                        chunk.text,
                        this.config.fontSize,
                    );
                }
            }

            currentY -= this.config.lineHeight;
        }

        const pdfBytes: Uint8Array = await pdfDoc.save();
        await Bun.write(outputPath, pdfBytes);
    }

    private wrapText(
        text: string,
        maxWidth: number,
        getTextWidth: TextWidth,
    ): string[] {
        if (this.config.wordWrap === 'none') return [text];
        const normalizedText: string = text.replace(/\t/g, '    ');

        // CHARACTER WRAPPING
        if (this.config.wordWrap === 'char') {
            const lines: string[] = [];
            let currentLine: string = '';
            for (const char of normalizedText) {
                if (getTextWidth(currentLine + char) > maxWidth) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine += char;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines.length > 0 ? lines : [''];
        }

        // WORD WRAPPING
        const leadingSpaceMatch: RegExpMatchArray | null =
            normalizedText.match(/^ +/);
        const leadingSpaces: string = leadingSpaceMatch
            ? leadingSpaceMatch[0]
            : '';
        const remainingText: string = normalizedText.slice(
            leadingSpaces.length,
        );

        // Split by spaces but preserve empty strings to maintain multiple spaces
        const words: string[] = remainingText.split(' ');
        const lines: string[] = [];
        let currentLine: string = leadingSpaces;

        for (const word of words) {
            // Determine what the line would look like if we add this word
            const isLineEmpty: boolean =
                currentLine === leadingSpaces || currentLine === '';
            const testLine: string = isLineEmpty
                ? `${currentLine}${word}`
                : `${currentLine} ${word}`;

            if (getTextWidth(testLine) <= maxWidth) {
                currentLine = testLine;
            } else {
                // The word doesn't fit on the current line.
                // If we've already added words to this line, push it and move the word to the next line.
                if (!isLineEmpty) {
                    lines.push(currentLine);
                    // Start next line with leading spaces preserved
                    currentLine = `${leadingSpaces}${word}`;

                    // Check if the single word itself is wider than the layout page width
                    if (getTextWidth(currentLine) > maxWidth) {
                        // Fallback: forced break of this massive single word
                        lines.push(currentLine);
                        currentLine = leadingSpaces;
                    }
                } else {
                    // If the single word is already at the start of a line and STILL exceeds maxWidth,
                    // we have no choice but to force-push it so it doesn't cause an infinite loop.
                    lines.push(testLine);
                    currentLine = leadingSpaces;
                }
            }
        }

        if (currentLine && currentLine !== leadingSpaces) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    }

    private async getFontSafely(
        fontPath: string,
        pdfDoc: PDFDocument,
    ): Promise<PDFFont> {
        try {
            const absoluteFontPath: string = path.resolve(
                import.meta.dir,
                fontPath,
            );
            const fontFile: BunFile = Bun.file(absoluteFontPath);
            if (!(await fontFile.exists())) {
                throw new Error(
                    `File not found at target resolution layout: "${absoluteFontPath}"`,
                );
            }
            const fontBytes: ArrayBuffer = await fontFile.arrayBuffer();
            return pdfDoc.embedFont(fontBytes); // No 'await' needed here when returning directly
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.warn(
                    `🚨 [ToPdf Warning]: Fallback to standard Monospace Courier used. ${e.message}`,
                );
            } else {
                // Optional: Catches edge cases where something that isn't an Error object was thrown
                console.warn(
                    `🚨 [ToPdf Warning]: Fallback to standard Monospace Courier used. Unknown error occurred.`,
                );
            }
            return pdfDoc.embedFont('Courier'); // No 'await' needed here either
        }
    }

    private async getText(sourcePath: string): Promise<string> {
        const sourceFile: BunFile = Bun.file(sourcePath);
        if (!(await sourceFile.exists())) {
            throw new Error(
                `Input text source file completely missing at path: "${sourcePath}"`,
            );
        }
        return sourceFile.text();
    }
}

export default class ToPdf {
    public static create(options?: Config): ToPdfService {
        const mergedConfig: Required<Config> = {
            ...DEFAULT_CONFIG,
            ...options,
        };
        return new ToPdfService(mergedConfig);
    }
}
