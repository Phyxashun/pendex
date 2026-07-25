import { Colors } from '@pendex/color';
import type { Category, State } from './types';

/**
 * Parametric Polymorphism with Generics
 *
 * @param value The value to return
 * @returns The value as type T
 */
export function identity<T>(value: T): T {
    return value;
}

export class View {
    protected readonly state: State;

    constructor(state: State) {
        // No `theme` fallback here: State.theme is a required Theme, not
        // Theme | undefined, and every real caller (Application.init(),
        // both standalone `import.meta.main` entry points, and every
        // current test fixture) already resolves one via
        // bootstrap.resolveRunnerDeps() before constructing a View. A
        // `|| FallbackTheme` here would be unreachable through any
        // type-safe call path — reconstructing the object at all was
        // also how `categoryColors` got silently dropped by CompileView/
        // SplitView, which built their own {theme, config} literal for
        // super(...) instead of forwarding the whole `state` they were
        // given. Storing it as-is avoids that class of bug entirely.
        this.state = state;
    }

    public async render(): Promise<void> {
        return;
    }

    /**
     * Styles text using the active theme's brand color for `category`,
     * bold + that hex, when one is defined. Falls back to `fallback`
     * (typically a semantic theme style like theme.bold or theme.primary)
     * for any category the active theme's [brand] table doesn't cover —
     * including every theme that has no [brand] table at all — so a
     * view can always call this and get sensible output regardless of
     * which theme is active.
     */
    protected categoryStyle(category: Category, fallback: (text: string) => string): (text: string) => string {
        const hex = this.state.categoryColors?.[category];
        if (!hex) return fallback;
        return (text: string) => Colors.bold(Colors.hex(hex)(text));
    }
}
