
import { describe, expect, test } from 'bun:test';
import { baseName, Constants, dirName, extName, joinPath } from '../src';

describe('Constants and Path Helpers', () => {
    describe('joinPath', () => {
        test('should join segments with forward slashes', () => {
            expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
        });

        test('should collapse multiple slashes', () => {
            expect(joinPath('a/', '/b//', 'c')).toBe('a/b/c');
        });

        test('should handle empty segments', () => {
            expect(joinPath('a', '', 'b', 'c')).toBe('a/b/c');
        });
    });
 
    describe('baseName', () => {
        test('returns the final segment of a posix path', () => {
            expect(baseName('src/utils/helper.ts')).toBe('helper.ts');
        });

        test('handles backslash separators', () => {
            expect(baseName('src\\utils\\helper.ts')).toBe('helper.ts');
        });

        test('returns the input when there is no separator', () => {
            expect(baseName('helper.ts')).toBe('helper.ts');
        });
    });
 
    describe('extName', () => {
        test('returns the extension with leading dot', () => {
            expect(extName('src/index.ts')).toBe('.ts');
        });

        test('returns only the last extension', () => {
            expect(extName('archive.tar.gz')).toBe('.gz');
        });

        test('returns empty string when there is no extension', () => {
            expect(extName('Makefile')).toBe('');
        });
 
        test('returns empty string for dotfiles (dot at index 0)', () => {
            expect(extName('.gitignore')).toBe('');
        });
    });
 
    describe('dirName', () => {
        test('returns the directory portion', () => {
            expect(dirName('src/utils/helper.ts')).toBe('src/utils');
        });

        test('handles backslash separators', () => {
            expect(dirName('src\\utils\\helper.ts')).toBe('src/utils');
        });

        test('returns "." when there is no separator', () => {
            expect(dirName('helper.ts')).toBe('.');
        });
    });
 
    describe('Constants object', () => {
        test('exposes the expected app-wide values', () => {
            expect(Constants.OUTPUT_DIR).toBe('ALL');
            expect(Constants.REBUILT_DIR).toBe('ALL_REBUILT');
            expect(Constants.DIVIDER).toContain('█');
            expect(Constants.GITIGNORE_PATH).toContain('.gitignore');
        });
    });
});
