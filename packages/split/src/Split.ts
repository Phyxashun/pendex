// FILE-PATH: packages/split/src/Split.ts

/**
 * @module Split
 *
 * Single responsibility: satisfy `Command` for "split" — hold its menu
 * identity and hand its deps to `SplitView`. See `Compile.ts` for the
 * fuller explanation of this file's (deliberately thin) role.
 */

import type { Command, State } from '@pendex/core';
import { Exit } from '@pendex/exit';
import { SplitView } from './SplitView';

/**
 * The "Split Archive" command: rebuilds original files from compiled archives.
 */
export class Split implements Command {
    readonly key = 'split';
    readonly label = 'Split Archive';
    readonly hint = 'Rebuild everything';

    private readonly state: State;
    private readonly view: SplitView;

    constructor(state: State) {
        this.state = state;
        this.view = new SplitView(this.state);
    }

    /**
     * Runs the split command by delegating to its {@link SplitView}.
     */
    async execute(): Promise<void> {
        await this.view.render();
    }
}

/**
 * STANDALONE EXECUTION ENTRY POINT
 * `bun run src/commands/Split.ts` — only pulls a Config, no App/State required.
 */
// c8 ignore start
if (import.meta.main) {

    const { resolveRunnerDeps } = await import('@pendex/core');
    const state = await resolveRunnerDeps();

    const split = await new Split(state);
    await split.execute();

    const exit = await new Exit(state);
    await exit.execute();
}
// c8 ignore stop
