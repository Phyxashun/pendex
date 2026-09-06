// oxlint-disable typescript/no-explicit-any

import {
    beforeEach,
    describe,
    expect,
    mock,
    spyOn,
    test,
    type Mock,
} from 'bun:test';

// Mock the module BEFORE all imports.
void mock.module('@clack/prompts', (): any => ({
    select: mock(),
    confirm: mock(),
    outro: mock(),
    intro: mock(),
    isCancel: mock((val: unknown): boolean => val === Symbol.for('cancel')),
}));

// Import the now-mocked functions and the application code.
import { confirm, select } from '@clack/prompts';
import { Compile } from '@pendex/compile';
import { Exit } from '@pendex/exit';
import { Application } from '../src/components/App';

const selectMock = select as Mock<typeof select>;
const confirmMock = confirm as Mock<typeof confirm>;

describe('Application Orchestrator (App.ts)', (): void => {
    let app: Application;
    const exitProcessMock: Mock<(code?: number | string | null) => never> =
        mock((code?: number | string | null): never => {
            throw new Error(`Process exited with code: ${code}`);
        });

    beforeEach(async (): Promise<void> => {
        selectMock.mockClear();
        confirmMock.mockClear();
        exitProcessMock.mockClear();
        Application.resetInstance();

        app = Application.getInstance();
        await app.init(exitProcessMock);
    });

    test('getInstance returns the same instance until reset', (): void => {
        expect(Application.getInstance()).toBe(app);
    });

    test('should execute a command and return true if user continues', async (): Promise<void> => {
        const compileCmdKey = app.commands.find(c => c instanceof Compile)!.key;
        selectMock.mockResolvedValueOnce(compileCmdKey);
        confirmMock.mockResolvedValueOnce(true);

        const compileSpy: Mock<() => Promise<void>> = spyOn(
            app.commands.find(c => c instanceof Compile)!,
            'execute',
        ).mockResolvedValue(undefined);

        const shouldContinue = await app.runSingleIteration();

        expect(compileSpy).toHaveBeenCalledTimes(1);
        expect(shouldContinue).toBe(true);
    });

    test('should execute a command and return false if user declines', async () => {
        const compileCmdKey = app.commands.find(c => c instanceof Compile)!.key;
        selectMock.mockResolvedValueOnce(compileCmdKey);
        confirmMock.mockResolvedValueOnce(false);

        const compileSpy: Mock<() => Promise<void>> = spyOn(
            app.commands.find(c => c instanceof Compile)!,
            'execute',
        ).mockResolvedValue(undefined);

        const shouldContinue: boolean = await app.runSingleIteration();

        expect(compileSpy).toHaveBeenCalledTimes(1);
        expect(shouldContinue).toBe(false);
    });

    test('should return false if user selects the "exit" command key', async (): Promise<void> => {
        const exitCmdKey = app.commands.find(c => c instanceof Exit)!.key;
        selectMock.mockResolvedValueOnce(exitCmdKey);

        const shouldContinue: boolean = await app.runSingleIteration();

        expect(shouldContinue).toBe(false);
    });

    test('should return false if user cancels the main menu prompt', async (): Promise<void> => {
        selectMock.mockResolvedValueOnce(Symbol.for('cancel'));

        const shouldContinue = await app.runSingleIteration();

        expect(shouldContinue).toBe(false);
    });

    test('should return true (and execute nothing) for an unrecognized command key', async (): Promise<void> => {
        // Covers the `if (command)` false branch: choice is neither
        // cancel nor "exit" nor any registered command key.
        selectMock.mockResolvedValueOnce('not-a-real-command');

        const executeSpies: Mock<() => Promise<void>>[] = app.commands.map(
            cmd => spyOn(cmd, 'execute').mockResolvedValue(undefined),
        );

        const shouldContinue: boolean = await app.runSingleIteration();

        expect(shouldContinue).toBe(true);
        for (const spy of executeSpies) {
            expect(spy).not.toHaveBeenCalled();
        }
    });

    test('run should loop until runSingleIteration returns false and then exit', async (): Promise<void> => {
        spyOn(app, 'init').mockResolvedValue(undefined);

        const iterationSpy: Mock<() => Promise<boolean>> = spyOn(
            app,
            'runSingleIteration',
        )
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        const exitSpy: Mock<() => Promise<void>> = spyOn(
            app.commands.find(c => c instanceof Exit)!,
            'execute',
        ).mockResolvedValue(undefined);

        await app.run(exitProcessMock);

        expect(iterationSpy).toHaveBeenCalledTimes(2);
        expect(exitSpy).toHaveBeenCalledTimes(1);
    });
});
