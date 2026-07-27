/**
 * @module View
 *
 * Base class for Pendex's view layer: holds the shared {@link State}
 * (theme + config + optional category colors) and provides
 * {@link View.categoryStyle}, the one shared piece of category-color
 * behavior every concrete view (CompileView, SplitView, ...) needs.
 */

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

/**
 * Base class for a Pendex view. Concrete views (e.g. `CompileView`,
 * `SplitView`) extend this to render output for a given {@link State}.
 */
export class View {
    protected readonly state: State;

    /**
     * @param state - The shared application state (theme, config, and optional category colors) this view renders against.
     */
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

    /** Renders this view's output. Base implementation is a no-op; subclasses override. */
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
     *
     * @param category - The category to look up a brand color for.
     * @param fallback - Style function to use when no brand color is defined for `category`.
     * @returns A style function: either the resolved brand-color styler, or `fallback`.
     */
    protected categoryStyle(category: Category, fallback: (text: string) => string): (text: string) => string {
        const hex = this.state.categoryColors?.[category];
        if (!hex) return fallback;
        return (text: string) => Colors.bold(Colors.hex(hex)(text));
    }
}
