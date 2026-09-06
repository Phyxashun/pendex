// FILE-PATH: packages/exit/tests/view.test.ts
//

/**
 * @file packages/exit/tests/view.test.ts
 * @description Unit tests for `ExitView.ts` and the base `View`
rendering pipeline, category styling,
 * and formatter options.
 */

import {
    resolveRunnerDeps,
    View,
    type Category,
    type ExitState,
    type State,
    type StyleFunction,
} from '@pendex/core';
import { beforeAll, describe, expect, test } from 'bun:test';
import { ExitView } from '../src/ExitView';

let state: State;
let exitState: ExitState;

beforeAll(async (): Promise<void> => {
    state = await resolveRunnerDeps();
    exitState = {
        theme: state.theme,
        config: state.config,
        exit: () => {
            throw new Error('Exit called');
        },
        exitCode: 0,
        categoryColors: {
            source: '#799470',
        },
    };
});

describe('ExitView', (): void => {
    test('should instantiate and render ExitView directly', async (): Promise<void> => {
        const exitView = new ExitView(exitState);
        await exitView.render();
        expect(exitView).toBeInstanceOf(ExitView);
    });

    test('should execute base View.prototype.render method', async (): Promise<void> => {
        const exitView = new ExitView(exitState);

        // Explicitly invokes base View.prototype.render
        await View.prototype.render.call(exitView);

        const baseView = new View(state);
        await baseView.render();
        expect(baseView).toBeInstanceOf(View);
    });

    test('should style text using categoryStyle with category hex and fallback', (): void => {
        const exitView = new ExitView(exitState);

        const categoryStyleFn = (
            exitView as unknown as {
                categoryStyle: (
                    category: Category,
                    fallback: StyleFunction,
                ) => StyleFunction;
            }
        ).categoryStyle.bind(exitView);

        const fallbackFn: StyleFunction = (text: string): string =>
            `FALLBACK:${text}`;

        // 1. Branch: hex is present in categoryColors ('source' -> '#799470')
        const sourceStyler: StyleFunction = categoryStyleFn(
            'source',
            fallbackFn,
        );
        const sourceResult: string = sourceStyler('SourceCode');

        expect(sourceResult).toContain('SourceCode');
        expect(sourceResult).not.toContain('FALLBACK:');

        // 2. Branch: hex is absent in categoryColors ('web' has no hex in categoryColors)
        const webStyler: StyleFunction = categoryStyleFn('web', fallbackFn);
        const webResult: string = webStyler('WebCode');

        expect(webResult).toBe('FALLBACK:WebCode');
    });
});
