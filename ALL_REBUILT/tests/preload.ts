// FILE-PATH: tests/preload.ts
/**
 * @file tests/preload.ts
 * @description Global preload for Bun test suite. Mocks UI dependencies and manages isolated
 * temporary sandbox environments with guaranteed post-suite cleanup.
 */

import type { Task } from '@clack/prompts';
import * as OriginalCore from '@pendex/core';
import { afterAll, mock, type Mock } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generic function signatures for Clack UI mock objects.
 */
type UnknownFunction = (...args: unknown[]) => unknown;

type SpinnerFunction = {
    start: Mock<UnknownFunction>;
    stop: Mock<UnknownFunction>;
    message: Mock<UnknownFunction>;
};

/**
 * Dynamic Package Resolution for Monorepos.
 * Resolves the target monorepo package root dynamically from `Bun.main`.
 */
const currentTestPath: string = Bun.main;

const packageMatch: RegExpMatchArray | null = currentTestPath.match(
    /[\\/]packages[\\/]([^\\/]+)/,
);

const currentPackageName: string | null | undefined = packageMatch
    ? packageMatch[1]
    : null;

if (!currentPackageName) {
    throw new Error(
        `Testing framework could not resolve the package name from path: ${currentTestPath}`,
    );
}

/**
 * Dynamically construct the path to the current package's root directory.
 */
const PACKAGE_ROOT: string = join(
    process.cwd(),
    'packages',
    currentPackageName,
);

/**
 * Sandbox Directory Setup (isolated per process ID per package suite).
 */
const UNIQUE_DIR: string = `test-sandbox-${process.pid}`;

export const ABSOLUTE_SANDBOX_PATH: string = join(
    PACKAGE_ROOT,
    'tests',
    UNIQUE_DIR,
);

const RUNTIME_CONFIG_PATH: string = join(
    ABSOLUTE_SANDBOX_PATH,
    'runtime.config.json',
);

// Registry of dynamically created temporary sandbox paths during test runs.
const activeSandboxPaths: Set<string> = new Set<string>([
    ABSOLUTE_SANDBOX_PATH,
]);

if (!existsSync(ABSOLUTE_SANDBOX_PATH)) {
    mkdirSync(ABSOLUTE_SANDBOX_PATH, { recursive: true });
}

/**
 * Mock Core Runtime Config Path
 */
void mock.module('@pendex/core', () => ({
    ...OriginalCore,
    Constants: {
        // oxlint-disable-next-line typescript/no-misused-spread
        ...OriginalCore.Constants,
        RUNTIME_CONFIG_PATH,
    },
}));

/**
 * Global Teardown Hook
 * Guarantees that the root process sandbox directory and all registered temporary directories
 * are forcibly removed after all test suites complete.
 */
afterAll((): void => {
    for (const dirPath of activeSandboxPaths) {
        if (existsSync(dirPath)) {
            rmSync(dirPath, {
                recursive: true,
                force: true,
            });
        }
    }
});

/**
 * Global UI Mocking for Clack Prompts
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
    spinner: (): SpinnerFunction => ({
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

/**
 * Creates a sandbox directory and registers it for global cleanup.
 *
 * @param dir - Target directory path to create.
 */
export async function createSandbox(dir: string): Promise<void> {
    activeSandboxPaths.add(dir);
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
    }
    mkdirSync(dir, { recursive: true });
}

/**
 * Removes a sandbox directory immediately and unregisters it from cleanup.
 *
 * @param dir - Target directory path to clean up.
 */
export async function cleanupSandbox(dir: string): Promise<void> {
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
    }
    activeSandboxPaths.delete(dir);
}
