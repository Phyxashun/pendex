// FILE-PATH: tests/bootstrap.test.ts
//
// resolveRunnerDeps() connects ConfigManager (which theme NAME) to
// ThemeManager (load that theme), and derives categoryColors from the
// loaded theme's [brand] table. Covered here: the default name path, a
// runtime-config override naming a different theme file, and both the
// present and absent [brand] table cases.

import { Colors } from '@pendex/color';
import { ThemeManager } from '@pendex/theme';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { ConfigManager, Constants, resolveRunnerDeps } from '../src';
import { cleanupSandbox, createSandbox } from './setup';

const SANDBOX = './test-sandbox';

describe('bootstrap.resolveRunnerDeps', () => {
    const originalCwd = process.cwd();

    beforeEach(async () => {
        Colors.enable();
        await createSandbox(SANDBOX);
        process.chdir(SANDBOX);
        ConfigManager.resetInstance();
        ThemeManager.resetInstance();
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await cleanupSandbox(SANDBOX);
        ConfigManager.resetInstance();
        ThemeManager.resetInstance();
    });

    test('resolves pendex — the canonical theme — for the default config', async () => {
        const deps = await resolveRunnerDeps();
        expect(deps.config.theme).toBe('pendex');
        // Brass #D6A448 = rgb(214, 164, 72):
        expect(deps.theme.primary('x').toString()).toContain('38;2;214;164;72');
    });

    test('resolves a named theme when runtime config selects it', async () => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ theme: 'dracula' }),
        );
        const deps = await resolveRunnerDeps();
        expect(deps.config.theme).toBe('dracula');
        // Dracula purple #BD93F9:
        expect(deps.theme.primary('x').toString()).toContain(
            '38;2;189;147;249',
        );
    });

    test('categoryColors is present for the default (pendex) config — every shipped theme has a [brand] table now', async () => {
        const deps = await resolveRunnerDeps();
        expect(deps.categoryColors?.source).toBeDefined();
        expect(Object.keys(deps.categoryColors ?? {})).toHaveLength(8);
    });

    test('categoryColors is undefined only for a theme with no [brand] table at all (an unknown theme name)', async () => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ theme: 'no-such-theme' }),
        );
        const deps = await resolveRunnerDeps();
        expect(deps.categoryColors).toBeUndefined();
    });

    test("categoryColors carries every Category the theme's [brand] table names exactly", async () => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ theme: 'pendex' }),
        );
        const deps = await resolveRunnerDeps();

        expect(deps.categoryColors?.source).toBe('#799470');
        expect(deps.categoryColors?.web).toBe('#6F92B0');
        expect(deps.categoryColors?.style).toBe('#D99C5A');
        expect(deps.categoryColors?.terminal).toBe('#3A352F');
        expect(deps.categoryColors?.configuration).toBe('#C78C5C');
        expect(deps.categoryColors?.documentation).toBe('#6F92B0');
        expect(deps.categoryColors?.testing).toBe('#A183B2');
        expect(deps.categoryColors?.misc).toBe('#7B746B');

        // The [brand] table's other entries (bookCover, manifest, ...)
        // aren't Category names — they're not included here:
        expect(Object.keys(deps.categoryColors ?? {})).toHaveLength(8);
    });

    test("categoryColors reflects whichever theme is active, not always pendex's colors", async () => {
        writeFileSync(
            Constants.RUNTIME_CONFIG_PATH,
            JSON.stringify({ theme: 'dracula' }),
        );
        const deps = await resolveRunnerDeps();
        expect(deps.categoryColors?.source).toBe('#50FA7B'); // Dracula green, not pendex olive
    });
});
