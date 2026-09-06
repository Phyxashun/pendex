// FILE-PATH: packages/core/tests/preload.ts
//
/**
 * @file packages/core/tests/preload.ts
 * @description Package-isolated preload for @pendex/core. Mocks UI interactions
 * and handles cleanup for test sandboxes scoped strictly to packages/core/tests/.
 */

import type { Task } from '@clack/prompts';
import { afterAll, mock, type Mock } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

type MockFunction = (...args: unknown[]) => unknown;

type SpinnerMock = {
    start: Mock<MockFunction>;
    stop: Mock<MockFunction>;
    message: Mock<MockFunction>;
};

/**
 * Absolute path to this package's tests directory.
 * `import.meta.dir` is always absolute to this file (`packages/core/tests`).
 */
export const PACKAGE_TESTS_DIR: string = import.meta.dir;
const UNIQUE_DIR: string = `test-sandbox-${process.pid}`;

export const ABSOLUTE_SANDBOX_PATH: string = join(
    PACKAGE_TESTS_DIR,
    UNIQUE_DIR,
);

const activeSandboxPaths: Set<string> = new Set<string>();

const tasksMock = mock(async (tasks: Task[]): Promise<void> => {
    for (const t of tasks) {
        if (typeof t.task === 'function') {
            await t.task(mock());
        }
    }
});

/**
 * Global UI Mocking for @clack/prompts within @pendex/core
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
    tasks: tasksMock,
    log: {
        success: mock(),
        warn: mock(),
        error: mock(),
        info: mock(),
        step: mock(),
        message: mock(),
    },
}));

/**
 * Resolves a given directory path safely against PACKAGE_TESTS_DIR if relative,
 * avoiding process.cwd() shifts.
 */
function resolveSandboxPath(dir: string): string {
    if (isAbsolute(dir)) {
        return dir;
    }
    return resolve(PACKAGE_TESTS_DIR, dir);
}

/**
 * Creates a package-scoped sandbox directory once per suite and registers it for cleanup.
 */
export async function createSandbox(dir: string): Promise<void> {
    const absoluteDir = resolveSandboxPath(dir);
    activeSandboxPaths.add(absoluteDir);

    if (existsSync(absoluteDir)) {
        rmSync(absoluteDir, { recursive: true, force: true });
    }
    mkdirSync(absoluteDir, { recursive: true });
}

/**
 * Removes a sandbox directory once per suite and unregisters it from cleanup.
 */
export async function cleanupSandbox(dir: string): Promise<void> {
    const absoluteDir = resolveSandboxPath(dir);

    if (existsSync(absoluteDir)) {
        rmSync(absoluteDir, { recursive: true, force: true });
    }
    activeSandboxPaths.delete(absoluteDir);
}

/**
 * Package Teardown Hook
 * Automatically cleans up all registered temporary sandboxes after all tests in this package complete.
 */
afterAll((): void => {
    for (const dirPath of activeSandboxPaths) {
        if (existsSync(dirPath)) {
            try {
                rmSync(dirPath, { recursive: true, force: true });
            } catch {
                // Ignore lock errors during process exit
            }
        }
    }
});
