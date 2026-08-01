// FILE-PATH: packages/core/tests/view.test.ts
//
// Base-class contract only. The CompileView/SplitView-specific
// forwarding regression tests live in their own packages now
// (packages/compile/tests/view.test.ts, packages/split/tests/view.test.ts)
// — each package verifies it doesn't drop State fields on its own,
// without @pendex/core needing to depend on either.

import { describe, expect, test } from 'bun:test';
import { FallbackTheme } from '@pendex/theme';
import { View, type Config, type State } from '../src';

class TestView extends View {
    public getState(): State {
        return this.state;
    }
}

const baseConfig: Config = {
    theme: 'pendex',
    outputDir: 'OUT',
    rebuiltDir: 'REBUILT',
    exclude: [],
    jobs: [],
};
const categoryColors = { source: '#799470', web: '#6F92B0' };

describe('View state construction', () => {
    test('View stores state as given, including categoryColors', () => {
        const view = new TestView({
            theme: FallbackTheme,
            config: baseConfig,
            categoryColors,
        });
        expect(view.getState().categoryColors).toBe(categoryColors);
    });

    test('View stores state as given when categoryColors is absent', () => {
        const view = new TestView({ theme: FallbackTheme, config: baseConfig });
        expect(view.getState().categoryColors).toBeUndefined();
    });
});
