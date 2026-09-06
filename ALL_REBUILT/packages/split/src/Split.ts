// FILE-PATH: packages/split/src/Split.ts

/**
 * @module Split
 *
 * Single responsibility: satisfy `Command` for "split" — hold its menu
 * identity and hand its deps to `SplitView`. See `Compile.ts` for the
 * fuller explanation of this file's (deliberately thin) role.
 */

import type { Command, State } from '@pendex/core';
import { SplitView } from './SplitView';

/**
 * The "Split Archive" command: rebuilds original files from compiled archives.
 */
export class Split implements Command {
    private readonly state: State;
    private readonly view: SplitView;

    readonly key: string;
    readonly label: string;
    readonly hint: string;

    private readonly STRINGS = {
        key: 'split',
        label: 'Split Archive',
        hint: 'Rebuild project files',
    } as const;

    constructor(state: State) {
        this.state = state;
        this.view = new SplitView(this.state);

        this.key = this.STRINGS.key;
        this.label = `${this.state.theme.secondary(this.STRINGS.label)}`;
        this.hint = `${this.state.theme.secondary(this.STRINGS.hint)}`;
    }

    /**
     * Runs the split command by delegating to its {@link SplitView}.
     */
    async execute(): Promise<void> {
        await this.view.render();
    }
}
