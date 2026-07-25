
import { describe, expect, mock, test } from 'bun:test';
import { Exit } from '../src/commands/Exit';
import { FallbackTheme } from '@pendex/theme';
import './setup';

describe('Exit Command', () => {
    test('should call exit function with code 0', async () => {
        const exitMock = mock(() => { });
        const deps = {
            theme: FallbackTheme,
            config: {
                theme: 'dark' as const,
                outputDir: 'ALL',
                rebuiltDir: 'ALL_REBUILT',
                exclude: [],
                jobs: [],
            },
            exit: exitMock,
        };

        const exitCmd = new Exit(deps);
        await exitCmd.execute();

        expect(exitMock).toHaveBeenCalledWith(0);
    });

    test('should have correct properties', () => {
        const exitMock = mock(() => { });
        const deps = {
            theme: FallbackTheme,
            config: {
                theme: 'dark' as const,
                outputDir: 'ALL',
                rebuiltDir: 'ALL_REBUILT',
                exclude: [],
                jobs: [],
            },
            exit: exitMock,
        };

        const exitCmd = new Exit(deps);

        expect(exitCmd.key).toBe('exit');
        expect(exitCmd.label).toBeDefined();
        expect(exitCmd.hint).toBeDefined();
    });
});
