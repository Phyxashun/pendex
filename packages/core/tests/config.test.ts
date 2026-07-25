import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { ConfigManager, Constants, assignKey } from '../src';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX_DIR = './test-sandbox-config';

describe('Configuration Logic (Config.ts)', () => {
    const originalCwd = process.cwd();

    beforeEach(async () => {
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
        ConfigManager.resetInstance();
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX_DIR);
        ConfigManager.resetInstance();
    });

    test('getInstance loads default config correctly', async () => {
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('ALL');
    });

    test('getInstance returns the SAME instance on repeat calls (singleton)', async () => {
        const first = await ConfigManager.getInstance();
        const second = await ConfigManager.getInstance();
        expect(second).toBe(first);
    });

    test('merges a runtime.config.json file over defaults', async () => {
        writeFileSync(Constants.RUNTIME_CONFIG_PATH, JSON.stringify({ theme: 'light', outputDir: 'CUSTOM_OUTPUT' }));
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('CUSTOM_OUTPUT');
    });

    test('falls back to defaults when runtime.config.json is corrupt', async () => {
        writeFileSync(Constants.RUNTIME_CONFIG_PATH, 'this is { not valid json');
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('ALL');   // defaults survived
    });

    test('reload re-reads and applies disk changes', async () => {
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('ALL');

        writeFileSync(Constants.RUNTIME_CONFIG_PATH, JSON.stringify({ outputDir: 'RELOADED' }));
        await manager.reload();

        expect(manager.get().outputDir).toBe('RELOADED');
    });

    test('save persists the in-memory config to runtime.config.json', async () => {
        const manager = await ConfigManager.getInstance();
        manager.get().outputDir = 'SAVED_OUTPUT';
        await manager.save();

        const onDisk = await Bun.file(Constants.RUNTIME_CONFIG_PATH).json();
        expect(onDisk.outputDir).toBe('SAVED_OUTPUT');

        // A fresh instance picks the saved value back up:
        ConfigManager.resetInstance();
        const fresh = await ConfigManager.getInstance();
        expect(fresh.get().outputDir).toBe('SAVED_OUTPUT');
    });

    test('resetToDefaults discards runtime overrides in memory without touching disk', async () => {
        writeFileSync(Constants.RUNTIME_CONFIG_PATH, JSON.stringify({ outputDir: 'OVERRIDDEN' }));
        const manager = await ConfigManager.getInstance();
        expect(manager.get().outputDir).toBe('OVERRIDDEN');

        await manager.resetToDefaults();
        expect(manager.get().outputDir).toBe('ALL');

        // Disk file untouched:
        const onDisk = await Bun.file(Constants.RUNTIME_CONFIG_PATH).json();
        expect(onDisk.outputDir).toBe('OVERRIDDEN');
    });

    test('assignKey copies defined values and skips undefined', () => {
        const target = { a: 1, b: 2 };
        assignKey(target, { a: 9 }, 'a');
        assignKey(target, {}, 'b');   // undefined in source → b untouched
        expect(target).toEqual({ a: 9, b: 2 });
    });
});
