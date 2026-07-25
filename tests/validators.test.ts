
import { describe, expect, test } from 'bun:test';
import { validateDirectory, validateGlobInput } from '../src/utils/validators';

describe('Validators', () => {
    describe('validateDirectory', () => {
        test('should return error for empty input', () => {
            expect(validateDirectory('')).toBe('This field is required and cannot be left blank.');
            expect(validateDirectory('   ')).toBe('This field is required and cannot be left blank.');
        });

        test('should return error for input with spaces', () => {
            expect(validateDirectory('my folder')).toBe('Spaces are not allowed in directory path names.');
        });

        test('should return error for invalid characters', () => {
            expect(validateDirectory('folder<name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
            expect(validateDirectory('folder>name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
            expect(validateDirectory('folder:name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
            expect(validateDirectory('folder"name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
            expect(validateDirectory('folder|name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
            expect(validateDirectory('folder?name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
            expect(validateDirectory('folder*name')).toBe('Directory name contains illegal path symbols (e.g., \\, :, *, ?, ", <, >, |).');
        });

        test('should return undefined for valid input', () => {
            expect(validateDirectory('validfolder')).toBeUndefined();
            expect(validateDirectory('valid-folder')).toBeUndefined();
            expect(validateDirectory('valid_folder')).toBeUndefined();
        });
    });

    describe('validateGlobInput', () => {
        test('should return error for empty input', () => {
            expect(validateGlobInput('')).toBe('This field is required and cannot be left blank.');
            expect(validateGlobInput('   ')).toBe('This field is required and cannot be left blank.');
        });

        test('should return error for empty glob patterns', () => {
            expect(validateGlobInput('  ,  ')).toBe('Glob lists cannot contain completely blank strings.');
            expect(validateGlobInput('pattern,,pattern')).toBe('Glob lists cannot contain completely blank strings.');
            expect(validateGlobInput('pattern,  ')).toBe('Glob lists cannot contain completely blank strings.');
        });

        test('should return undefined for valid input', () => {
            expect(validateGlobInput('**/*.ts')).toBeUndefined();
            expect(validateGlobInput('pattern1,pattern2')).toBeUndefined();
        });
    });
});
