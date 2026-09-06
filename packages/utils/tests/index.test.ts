// oxlint-disable typescript/no-explicit-any
import { describe, expect, spyOn, test, type Mock } from 'bun:test';
import { Message } from '../src';

describe('Entry Point (index.ts)', (): void => {
    test('Message function should handle Error objects', (): void => {
        const consoleSpy: Mock<any> = spyOn(
            console,
            'error',
        ).mockImplementation((): void => {});
        try {
            Message(new Error('Test error'));
            expect(consoleSpy).toHaveBeenCalledWith('Fatal crash: Test error');
        } finally {
            // Restore the original console.error function
            consoleSpy.mockRestore();
        }
    });

    test('Message function should handle non-Error messages', (): void => {
        const consoleSpy: Mock<any> = spyOn(
            console,
            'error',
        ).mockImplementation((): void => {});
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
