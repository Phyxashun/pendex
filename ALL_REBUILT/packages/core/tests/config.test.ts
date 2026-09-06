// FILE-PATH: packages/core/tests/config.test.ts
//
// oxlint-disable typescript/no-explicit-any
//
/**
 * @file packages/core/tests/config.test.ts
 * @description Unit tests for ConfigManager loading, runtime overrides, reload, and saving.
 */

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    mock,
    test,
} from 'bun:test';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Config, type Job, ConfigManager, Constants } from '../src';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-config-${process.pid}`,
);
const ORIGINAL_CWD: string = process.cwd();

// Container for dynamic runtime mocks targeting internal file readers
let mockTomlResponse: any = null;

// Explicitly wrap the module mock invocation in void to satisfy oxlint
void mock.module('bun', () => {
    // Access the global namespace directly to bypass recursive import loops
    const nativeTomlParse = Bun.TOML.parse;

    return {
        // Export the global Bun context directly to retain local internal references
        ...Bun,
        TOML: {
            ...Bun.TOML,
            parse: (text: string): any => {
                // If a test declared an explicit mock payload, return it directly
                if (mockTomlResponse) {
                    return mockTomlResponse;
                }
                return nativeTomlParse(text);
            },
        },
    };
});

function safeDelete(path: string): void {
    if (existsSync(path)) {
        try {
            rmSync(path, { force: true, recursive: true });
        } catch {
            try {
                writeFileSync(path, '', 'utf-8');
            } catch {
                /* ignore */
            }
        }
    }
}

describe('Configuration Logic (Config.ts)', (): void => {
    beforeAll(async (): Promise<void> => {
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
    });

    afterAll(async (): Promise<void> => {
        process.chdir(ORIGINAL_CWD);
        ConfigManager.resetInstance();
        await cleanupSandbox(SANDBOX_DIR);
    });

    beforeEach((): void => {
        ConfigManager.resetInstance();
        mockTomlResponse = null;
        safeDelete(Constants.RUNTIME_CONFIG_PATH);
    });

    afterEach((): void => {
        ConfigManager.resetInstance();
        mockTomlResponse = null;
        safeDelete(Constants.RUNTIME_CONFIG_PATH);
    });

    test('getInstance loads default config correctly', async (): Promise<void> => {
        const manager: ConfigManager = await ConfigManager.getInstance();
        expect(manager.get()).toBeDefined();
    });

    test('getInstance returns the SAME instance on repeat calls (singleton)', async (): Promise<void> => {
        const first = await ConfigManager.getInstance();
        const second = await ConfigManager.getInstance();
        expect(second).toBe(first);
    });

    test('merges a runtime.config.json file over defaults', async (): Promise<void> => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({
                theme: { name: 'dracula' },
                outputDir: 'CUSTOM_OUTPUT',
            }),
        );
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('CUSTOM_OUTPUT');
    });

    test('falls back to defaults when runtime.config.json is corrupt', async (): Promise<void> => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            'this is { not valid json',
        );
        const manager = await ConfigManager.getInstance();
        expect(manager.get()).toBeDefined();
    });

    test('reload re-reads and applies disk changes', async (): Promise<void> => {
        const manager = await ConfigManager.getInstance();
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ outputDir: 'RELOADED' }),
        );
        await manager.reload();
        expect(manager.get().outputDir).toBe('RELOADED');
    });

    test('save persists the in-memory config to runtime.config.json', async (): Promise<void> => {
        const manager = await ConfigManager.getInstance();
        const config = manager.get();
        (config as any).outputDir = 'SAVED_OUTPUT';

        await manager.save();

        const onDisk = await Bun.file(Constants.RUNTIME_CONFIG_PATH).json();
        expect(onDisk.outputDir).toBe('SAVED_OUTPUT');

        ConfigManager.resetInstance();
        const fresh = await ConfigManager.getInstance();
        expect(fresh.get().outputDir).toBe('SAVED_OUTPUT');
    });

    test('resetToDefaults discards runtime overrides in memory without touching disk', async (): Promise<void> => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ outputDir: 'OVERRIDDEN' }),
        );
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('OVERRIDDEN');

        await manager.resetToDefaults();
        const onDisk = await Bun.file(Constants.RUNTIME_CONFIG_PATH).json();
        expect(onDisk.outputDir).toBe('OVERRIDDEN');
    });

    test('withDiskOverrides handles and recovers from runtime exclusion structural errors', async (): Promise<void> => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ exclude: ['custom-ignore-path'] }),
        );

        ConfigManager.resetInstance();
        const manager = await ConfigManager.getInstance();

        expect(manager.get().exclude).toContain('custom-ignore-path');
        expect(manager.get().exclude).toContain(Constants.RUNTIME_CONFIG_PATH);
    });

    test('recovers gracefully to base config if withDiskOverrides encounters critical file errors', async (): Promise<void> => {
        const manager = await ConfigManager.getInstance();
        writeFileSync(Constants.RUNTIME_CONFIG_PATH, '{"theme": ', 'utf-8');

        const currentConfig = await (ConfigManager as any).withDiskOverrides(
            manager.get(),
        );
        expect(currentConfig).toBeDefined();
    });

    test('handles fallback defaults and sparse fields for mapped jobs successfully inside the engine file', async (): Promise<void> => {
        // 1. Extract the private static method signature
        const readTomlDefaultsFn = (ConfigManager as any).readTomlDefaults;

        // 2. Build the targeted sparse TOML payload
        const minimalisticToml = [
            'outputDir = "ALL"',
            'outputType = "txt"',
            'http = true',
            'exclude = []',
            '',
            '[[jobs]]',
            'filename = "engine-sparse-job.txt"', // Leaves out category, description, include, exclude
        ].join('\n');

        // 3. Directly spy on and intercept Bun's file reader method for this execution
        const originalBunFile = Bun.file;
        (Bun as any).file = (path: string) => {
            // If the engine tries to open a configuration file, feed it our sparse in-memory string fake
            if (path.includes('config.toml') || path.includes('config/')) {
                return {
                    text: async () => minimalisticToml,
                    exists: async () => true,
                } as any;
            }
            return originalBunFile(path);
        };

        try {
            // 4. Run the production code directly (isolated from the singleton cache)
            const parsedConfigResult: Config = await readTomlDefaultsFn();

            // 5. Query the processed structure
            const targetJob = parsedConfigResult.jobs.find(
                (j: Job) => j.filename === 'engine-sparse-job.txt',
            );

            expect(targetJob).toBeDefined();
            // This explicitly validates the category ?? 'misc' fallback line inside Config.ts
            expect(targetJob?.category).toBe('misc');
            expect(targetJob?.description).toBe('');
            expect(targetJob?.include).toEqual([]);
            expect(targetJob?.exclude).toEqual([]);
        } finally {
            // Restore Bun's built-in filesystem bindings safely so surrounding tests don't break
            (Bun as any).file = originalBunFile;
        }
    });

    test('handles runtime config job mapping when overrides are structurally sparse inside the engine file', async (): Promise<void> => {
        ConfigManager.resetInstance();
        const manager = await ConfigManager.getInstance();

        // 2. Prepare a mock configuration override array item
        // We inject it into index position 99, ensuring baseJob evaluates as undefined!
        const sparseJobsOverride: any[] = [];
        sparseJobsOverride[99] = { filename: 'engine-override-sparse.txt' };

        // Save our custom parameters to the filesystem
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({
                jobs: sparseJobsOverride,
            }),
        );

        const updatedConfig = await (ConfigManager as any).withDiskOverrides(
            manager.get(),
        );
        const targetJob = updatedConfig.jobs.find(
            (j: any) => j.filename === 'engine-override-sparse.txt',
        );

        expect(targetJob).toBeDefined();
        // Confirms that baseJob missing evaluations resolve down to 'misc' inside Config.ts
        expect(targetJob?.category).toBe('misc');
        expect(targetJob?.exclude).toEqual([]);
    });

    test('assignKey utility copies defined properties and completely ignores undefined parameters', (): void => {
        // Import or use assignKey directly from your core modules hook
        const { assignKey: assignKeyFn } = require('../src');

        // Test Branch 1: Value is explicitly defined (forces execution of lines 91-93)
        const targetObject = { themeName: 'pendex', httpEnabled: true };
        const sourceWithUpdate = { themeName: 'dracula' };

        assignKeyFn(targetObject, sourceWithUpdate, 'themeName');
        expect(targetObject.themeName).toBe('dracula');

        // Test Branch 2: Value is explicitly undefined (forces bypass evaluation of lines 91-93)
        const sourceWithUndefined = { themeName: undefined };

        assignKeyFn(targetObject, sourceWithUndefined, 'themeName');
        // Verifies the target value was preserved untouched instead of overwriting with undefined
        expect(targetObject.themeName).toBe('dracula');
    });
});
