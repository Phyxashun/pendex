// FILE-PATH: packages/core/tests/view.test.ts
//

/**
 * @file packages/core/tests/view.test.ts
 * @description Unit tests for View base class state construction, base rendering, category styling, and identity helper.
 */

import { FallbackTheme } from '@pendex/theme';
import { describe, expect, test } from 'bun:test';
import {
    identity,
    View,
    type Category,
    type Config,
    type State,
    type StyleFunction,
} from '../src';

class TestView extends View {
    public getState(): State {
        return this.state;
    }

    public callCategoryStyle(
        category: Category,
        fallback: StyleFunction,
    ): StyleFunction {
        return this.categoryStyle(category, fallback);
    }
}

const baseConfig: Config = {
    theme: {
        name: 'pendex',
        path: './themes',
    },
    outputDir: 'OUT',
    rebuiltDir: 'REBUILT',
    exclude: [],
    jobs: [],
};

const categoryColors = { source: '#799470', web: '#6F92B0' };

describe('View Base Class', (): void => {
    test('identity generic helper returns value unchanged', (): void => {
        expect(identity('hello')).toBe('hello');
        expect(identity(42)).toBe(42);
    });

    test('View stores state as given, including categoryColors', (): void => {
        const view = new TestView({
            theme: FallbackTheme,
            config: baseConfig,
            categoryColors,
        });
        expect(view.getState().categoryColors).toBe(categoryColors);
    });

    test('View stores state as given when categoryColors is absent', (): void => {
        const view = new TestView({ theme: FallbackTheme, config: baseConfig });
        expect(view.getState().categoryColors).toBeUndefined();
    });

    test('base View.prototype.render returns undefined gracefully', async (): Promise<void> => {
        const view = new View({ theme: FallbackTheme, config: baseConfig });
        const result = await view.render();
        expect(result).toBeUndefined();
    });

    test('categoryStyle returns brand hex style when defined and fallback when absent', (): void => {
        const view = new TestView({
            theme: FallbackTheme,
            config: baseConfig,
            categoryColors,
        });
        const fallbackFn: StyleFunction = (text: string): string =>
            `FALLBACK:${text}`;

        // Category with color defined ('source' -> '#799470')
        const sourceStyler = view.callCategoryStyle('source', fallbackFn);
        const sourceRes = sourceStyler('code');
        expect(sourceRes).toContain('code');
        expect(sourceRes).not.toContain('FALLBACK:');

        // Category without color defined ('style')
        const styleStyler = view.callCategoryStyle('style', fallbackFn);
        const styleRes = styleStyler('code');
        expect(styleRes).toBe('FALLBACK:code');
    });
});
