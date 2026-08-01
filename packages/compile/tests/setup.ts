import { mock } from 'bun:test';

// Globally mock @clack/prompts so tests don't hang waiting for user input
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

// Utility functions for sandbox management using native fs APIs
import { existsSync, mkdirSync, rmSync } from 'node:fs';

export async function createSandbox(dir: string): Promise<void> {
    // Use native Node.js fs APIs which handle Windows paths better
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
    }
    mkdirSync(dir, { recursive: true });
}

export async function cleanupSandbox(dir: string): Promise<void> {
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
    }
}
