// FILE-PATH: packages/split/tests/preload.ts
//
// Mocks @clack/prompts so render() calls do not hang waiting for
// interactive input during `bun test`. Each package that calls into
// @clack/prompts (directly or via a View it constructs) needs its own
// copy of this preload -- bun test runs each package's suite as its
// own process, so mocks do not cross package boundaries.

import { mock } from 'bun:test';

mock.module('@clack/prompts', () => ({
    intro: mock(),
    outro: mock(),
    box: mock(),
    note: mock(),
    text: mock(),
    select: mock(),
    confirm: mock(),
    multiselect: mock(),
    isCancel: (val: unknown) => val === Symbol.for('cancel'),
    spinner: () => ({ start: mock(), stop: mock(), message: mock() }),
    tasks: mock(async (tasks: Array<{ task?: () => Promise<void> | void }>) => {
        for (const t of tasks) {
            if (typeof t.task === 'function') {
                await t.task();
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
