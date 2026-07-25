// FILE-PATH: tests/preload.ts
//
// Root-suite preload. Two global mocks:
//
// 1. @clack/prompts — so render()/menu calls never hang waiting for
//    interactive input. `tasks` runs each task fn for real so service
//    work still executes under the mocked spinner.
//
// 2. '@pendex/core' — partially mocked to redirect
//    Constants.RUNTIME_CONFIG_PATH into ./test-sandbox. The path is
//    computed once at Constants' first import, so process.chdir() in a
//    beforeEach can't retroactively move it; mocking the package entry
//    specifier is what makes every `import { Constants } from
//    '@pendex/core'` (including ConfigManager's internal use) see the
//    sandboxed path regardless of import order. Note each package's own
//    test suite has its own preload — bun runs suites per-package, so
//    mocks don't cross package boundaries.

import { mock } from 'bun:test';
import * as OriginalCore from '@pendex/core';

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

const SANDBOX_DIR = './test-sandbox';
const RUNTIME_CONFIG_PATH = `${process.cwd()}/${SANDBOX_DIR}/runtime.config.json`;

mock.module('@pendex/core', () => ({
    ...OriginalCore,
    Constants: {
        ...OriginalCore.Constants,
        RUNTIME_CONFIG_PATH,
    },
}));
