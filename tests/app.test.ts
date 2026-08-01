import {
    beforeEach,
    describe,
    expect,
    mock,
    spyOn,
    test,
    type Mock,
} from 'bun:test';

// 1. Mock the module BEFORE all imports. This is the correct Bun pattern.
mock.module('@clack/prompts', () => ({
    select: mock(),
    confirm: mock(),
    outro: mock(),
    intro: mock(),
    isCancel: mock((val: unknown) => val === Symbol.for('cancel')),
}));

// 2. Import the now-mocked functions and the application code.
import { confirm, select } from '@clack/prompts';
import { Compile } from '@pendex/compile';
import { Exit } from '../src/commands/Exit';
import { Application } from '../src/components/App';
import './setup';

const selectMock = select as Mock<typeof select>;
const confirmMock = confirm as Mock<typeof confirm>;

describe('Application Orchestrator (App.ts)', () => {
    let app: Application;
    const exitProcessMock = mock((_code?: number) => {});

    beforeEach(async () => {
        selectMock.mockClear();
        confirmMock.mockClear();
        exitProcessMock.mockClear();
        Application.resetInstance();

        app = Application.getInstance();
        await app.init(exitProcessMock);
    });

    test('getInstance returns the same instance until reset', () => {
        expect(Application.getInstance()).toBe(app);
    });

    test('should execute a command and return true if user continues', async () => {
        const compileCmdKey = app.commands.find(c => c instanceof Compile)!.key;
        selectMock.mockResolvedValueOnce(compileCmdKey);
        confirmMock.mockResolvedValueOnce(true);

        const compileSpy = spyOn(
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

        const compileSpy = spyOn(
            app.commands.find(c => c instanceof Compile)!,
            'execute',
        ).mockResolvedValue(undefined);

        const shouldContinue = await app.runSingleIteration();

        expect(compileSpy).toHaveBeenCalledTimes(1);
        expect(shouldContinue).toBe(false);
    });

    test('should return false if user selects the "exit" command key', async () => {
        const exitCmdKey = app.commands.find(c => c instanceof Exit)!.key;
        selectMock.mockResolvedValueOnce(exitCmdKey);

        const shouldContinue = await app.runSingleIteration();

        expect(shouldContinue).toBe(false);
    });

    test('should return false if user cancels the main menu prompt', async () => {
        selectMock.mockResolvedValueOnce(Symbol.for('cancel'));

        const shouldContinue = await app.runSingleIteration();

        expect(shouldContinue).toBe(false);
    });

    test('should return true (and execute nothing) for an unrecognized command key', async () => {
        // Covers the `if (command)` false branch: choice is neither
        // cancel nor "exit" nor any registered command key.
        selectMock.mockResolvedValueOnce('not-a-real-command');

        const executeSpies = app.commands.map(cmd =>
            spyOn(cmd, 'execute').mockResolvedValue(undefined),
        );

        const shouldContinue = await app.runSingleIteration();

        expect(shouldContinue).toBe(true);
        for (const spy of executeSpies) {
            expect(spy).not.toHaveBeenCalled();
        }
    });

    test('run should loop until runSingleIteration returns false and then exit', async () => {
        spyOn(app, 'init').mockResolvedValue(undefined);

        const iterationSpy = spyOn(app, 'runSingleIteration')
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        const exitSpy = spyOn(
            app.commands.find(c => c instanceof Exit)!,
            'execute',
        ).mockResolvedValue(undefined);

        await app.run(exitProcessMock);

        expect(iterationSpy).toHaveBeenCalledTimes(2);
        expect(exitSpy).toHaveBeenCalledTimes(1);
    });
});
