// FILE-PATH: packages/core/tests/constants.test.ts
//

/**
 * @file packages/core/tests/constants.test.ts
 * @description Unit tests for path string helpers and the app-wide Constants singleton.
 */

import { describe, expect, test } from 'bun:test';
import { baseName, Constants, dirName, extName, joinPath } from '../src';

describe('Constants and Path Helpers', (): void => {
    describe('joinPath', (): void => {
        test('should join segments with forward slashes', (): void => {
            expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
        });

        test('should collapse multiple slashes', (): void => {
            expect(joinPath('a/', '/b//', 'c')).toBe('a/b/c');
        });

        test('should handle empty segments', (): void => {
            expect(joinPath('a', '', 'b', 'c')).toBe('a/b/c');
        });
    });

    describe('baseName', (): void => {
        test('returns the final segment of a posix path', (): void => {
            expect(baseName('src/utils/helper.ts')).toBe('helper.ts');
        });

        test('handles backslash separators', (): void => {
            expect(baseName('src\\utils\\helper.ts')).toBe('helper.ts');
        });

        test('returns the input when there is no separator', (): void => {
            expect(baseName('helper.ts')).toBe('helper.ts');
        });
    });

    describe('extName', (): void => {
        test('returns the extension with leading dot', (): void => {
            expect(extName('src/index.ts')).toBe('.ts');
        });

        test('returns only the last extension', (): void => {
            expect(extName('archive.tar.gz')).toBe('.gz');
        });

        test('returns empty string when there is no extension', (): void => {
            expect(extName('Makefile')).toBe('');
        });

        test('returns empty string for dotfiles (dot at index 0)', (): void => {
            expect(extName('.gitignore')).toBe('');
        });
    });

    describe('dirName', (): void => {
        test('returns the directory portion', (): void => {
            expect(dirName('src/utils/helper.ts')).toBe('src/utils');
        });

        test('handles backslash separators', (): void => {
            expect(dirName('src\\utils\\helper.ts')).toBe('src/utils');
        });

        test('returns "." when there is no separator', (): void => {
            expect(dirName('helper.ts')).toBe('.');
        });
    });

    describe('Constants object', (): void => {
        const divider: string = '████████████████████████████████████████';

        test('exposes the expected app-wide values', (): void => {
            const constantsAccess = Constants as unknown as {
                BLOCK: string;
                WIDTH: number;
            };
            expect(constantsAccess.BLOCK).toBe('█');
            expect(constantsAccess.WIDTH).toBe(40);

            expect(Constants.OUTPUT_DIR).toBe('ALL');
            expect(Constants.REBUILT_DIR).toBe('ALL_REBUILT');
            expect(Constants.ENCODING).toBe('utf-8');
            expect(Constants.DIVIDER).toBe(divider);
            expect(Constants.GITIGNORE_PATH.endsWith('.gitignore')).toBe(true);
            expect(
                Constants.RUNTIME_CONFIG_PATH.endsWith('runtime.config.json'),
            ).toBe(true);
        });
    });
});
