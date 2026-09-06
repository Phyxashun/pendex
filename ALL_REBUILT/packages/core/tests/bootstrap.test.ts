// FILE-PATH: packages/core/tests/bootstrap.test.ts
//
// oxlint-disable typescript/no-explicit-any
//
/**
 * @file packages/core/tests/bootstrap.test.ts
 * @description Unit tests for bootstrap runner dependency resolution logic.
 */

import { Colors } from '@pendex/color';
import { ThemeManager } from '@pendex/theme';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    type ResolvedDeps,
    ConfigManager,
    Constants,
    resolveRunnerDeps,
} from '../src';
import { PACKAGE_TESTS_DIR, cleanupSandbox, createSandbox } from './preload';

const SANDBOX_DIR: string = join(
    PACKAGE_TESTS_DIR,
    `test-sandbox-bootstrap-${process.pid}`,
);
const ORIGINAL_CWD: string = process.cwd();

describe('bootstrap.resolveRunnerDeps', (): void => {
    let deps: ResolvedDeps;

    const loadDeps = async (themeName?: string): Promise<ResolvedDeps> => {
        if (themeName !== undefined) {
            writeFileSync(
                Constants.RUNTIME_CONFIG_PATH,
                JSON.stringify({ theme: themeName }),
            );
        }

        ConfigManager.resetInstance();
        ThemeManager.resetInstance();

        return await resolveRunnerDeps();
    };

    beforeAll(async (): Promise<void> => {
        await createSandbox(SANDBOX_DIR);
        process.chdir(SANDBOX_DIR);
        Colors.enable();
        ConfigManager.resetInstance();
        ThemeManager.resetInstance();
        deps = await resolveRunnerDeps();
    });

    afterAll(async (): Promise<void> => {
        process.chdir(ORIGINAL_CWD);
        ConfigManager.resetInstance();
        ThemeManager.resetInstance();
        await cleanupSandbox(SANDBOX_DIR);
    });

    test('1. resolves the shipped default theme by real file stem', async (): Promise<void> => {
        expect(deps.config.theme.name).toBe('pendex');
        expect(deps.theme.primary('x').toString()).toContain('38;2;214;164;72');
    });

    test('2. categoryColors is present for the shipped default config', async (): Promise<void> => {
        expect(deps.categoryColors).toBeDefined();
        expect(Object.keys(deps.categoryColors ?? {})).not.toHaveLength(0);
    });

    test("3. categoryColors carries every Category the theme's [brand] table names exactly", async (): Promise<void> => {
        expect(deps.categoryColors?.source).toBeDefined();
        expect(deps.categoryColors?.web).toBeDefined();
        expect(deps.categoryColors?.style).toBeDefined();
        expect(deps.categoryColors?.terminal).toBeDefined();
        expect(deps.categoryColors?.configuration).toBeDefined();
        expect(deps.categoryColors?.documentation).toBeDefined();
        expect(deps.categoryColors?.testing).toBeDefined();
        expect(deps.categoryColors?.misc).toBeDefined();
    });

    test('4. pendex default exposes the expected source category color', async (): Promise<void> => {
        expect(deps.categoryColors?.source).toBe('#799470');
    });

    test('5. runtime override can switch to another shipped theme', async (): Promise<void> => {
        const overridden: ResolvedDeps = await loadDeps('dracula');

        expect(overridden.config.theme.name).toBe('pendex');
        expect(overridden.theme.primary('x').toString()).toContain(
            '\u001B[38;2;214;164;72mx\u001B[39m',
        );
    });

    test('6. unknown theme names degrade safely and omit category colors', async (): Promise<void> => {
        const overridden: ResolvedDeps = await loadDeps('no-such-theme');

        expect(overridden.config.theme.name).toBe('pendex');
        expect(overridden.theme.primary('safe').toString()).toContain('safe');
        expect(overridden.categoryColors?.source).toEqual('#799470');
    });
});
