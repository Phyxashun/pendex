// FILE-PATH: packages/exit/tests/preload.ts
//

/**
 * @file packages/exit/tests/preload.ts
 * @description Package-isolated preload for @pendex/exit. Mocks UI interactions
 * for test suites scoped strictly to packages/exit/tests/.
 */

import type { Task } from '@clack/prompts';
import { mock } from 'bun:test';

type MockFunction = (...args: unknown[]) => unknown;

type SpinnerMock = {
    start: Mock<MockFunction>;
    stop: Mock<MockFunction>;
    message: Mock<MockFunction>;
};

/**
 * Global UI Mocking for @clack/prompts within @pendex/exit
 */
void mock.module('@clack/prompts', () => ({
    intro: mock(),
    outro: mock(),
    box: mock(),
    note: mock(),
    text: mock(),
    select: mock(),
    confirm: mock(),
    multiselect: mock(),
    isCancel: (val: unknown): boolean => val === Symbol.for('cancel'),
    spinner: (): SpinnerMock => ({
        start: mock(),
        stop: mock(),
        message: mock(),
    }),
    tasks: mock(async (tasks: Task[]): Promise<void> => {
        for (const t of tasks) {
            if (typeof t.task === 'function') {
                await t.task(mock());
            }
        }
    }),
    log: {
        success: mock(),
        warn: mock(),
        error: mock(),
        info: mock(),
        step: mock(),
        message: mock(),
    },
}));
