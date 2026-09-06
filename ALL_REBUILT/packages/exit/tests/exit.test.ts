// FILE-PATH: packages/exit/tests/exit.test.ts
//

/**
 * @file packages/exit/tests/exit.test.ts
 * @description Unit test suite for `Exit.ts`, achieving 100% test &
branch coverage across
 * command property initialization, custom exit callbacks, and default
process exit fallbacks.
 */

import { resolveRunnerDeps, type ExitState, type State } from '@pendex/core';
import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    mock,
    spyOn,
    test,
    type Mock,
} from 'bun:test';
import { Exit } from '../src/Exit';

type ExitFn = ExitState['exit'];
type ExitCode = number | string | null | undefined;

let exitMock: Mock<ExitFn>;
let state: State;
let exitState: ExitState;
let exitCmd: Exit;

beforeAll(async (): Promise<void> => {
    state = await resolveRunnerDeps();
});

beforeEach((): void => {
    exitMock = mock((_code?: ExitCode): never => {
        return undefined as never;
    });

    exitState = {
        theme: state.theme,
        config: {
            theme: state.config.theme,
            outputDir: 'ALL',
            rebuiltDir: 'ALL_REBUILT',
            exclude: [],
            jobs: [],
        },
        exit: exitMock,
        exitCode: 0,
    };

    exitCmd = new Exit(exitState);
});

describe('Exit Command (Exit.ts)', (): void => {
    test('should have correct key, label, and hint properties', (): void => {
        expect(exitCmd.key).toBe('exit');
        expect(exitCmd.label).toBeDefined();
        expect(exitCmd.hint).toBeDefined();

        expect(exitCmd.label).toContain('Exit program');
        expect(exitCmd.hint).toContain('Terminate system process');
    });

    test('should call custom exit function with code 0 when exit state property is provided', async (): Promise<void> => {
        await exitCmd.execute();

        expect(exitMock).toHaveBeenCalledWith(0);
    });

    test('should fallback to process.exit when state.exit function is not provided', async (): Promise<void> => {
        const processExitSpy = spyOn(process, 'exit').mockImplementation(
            (_code?: number): never => {
                return undefined as never;
            },
        );

        const fallbackState = {
            theme: state.theme,
            config: exitState.config,
            exitCode: 0,
        } as ExitState;

        delete (fallbackState as { exit?: ExitFn }).exit;

        const fallbackExitCmd = new Exit(fallbackState);
        await fallbackExitCmd.execute();

        expect(processExitSpy).toHaveBeenCalledWith(0);
        processExitSpy.mockRestore();
    });
});
