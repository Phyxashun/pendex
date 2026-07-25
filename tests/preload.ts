// FILE-PATH: tests/preload.ts
//
// Root-suite preload. Mocks @clack/prompts so render()/menu calls never
// hang waiting for interactive input. `tasks` runs each task fn for
// real so service work still executes under the mocked spinner.
//
// No Constants.RUNTIME_CONFIG_PATH redirect here (there used to be
// one): Constants.ts's BASE_DIR/GITIGNORE_PATH/RUNTIME_CONFIG_PATH are
// now live getters over process.cwd() rather than fields frozen at
// first import, so a plain process.chdir() in a test's beforeEach is
// enough on its own — mocking the module would only reintroduce the
// staleness that fix solved.

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
        success: mock(), warn: mock(), error: mock(),
        info: mock(), step: mock(), message: mock(),
    },
}));
