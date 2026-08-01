import { describe, expect, spyOn, test } from 'bun:test';
import { Message } from '../src/index';
import './setup';

describe('Entry Point (index.ts)', () => {
    test('Message function should handle Error objects', () => {
        const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
        try {
            Message(new Error('Test error'));
            expect(consoleSpy).toHaveBeenCalledWith('Fatal crash: Test error');
        } finally {
            // Restore the original console.error function
            consoleSpy.mockRestore();
        }
    });

    test('Message function should handle non-Error messages', () => {
        const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
        try {
            Message('A simple string error');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Fatal crash: A simple string error',
            );
        } finally {
            consoleSpy.mockRestore();
        }
    });
});
