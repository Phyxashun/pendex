//
// SINGLE RESPONSIBILITY: satisfy Command for "split" — hold its menu
// identity and hand its deps to SplitView. See Compile.ts for the
// fuller explanation of this file's (deliberately thin) role.

import type { Command, State } from '@pendex/core';
import { SplitView } from './SplitView';

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
    await new Split(await resolveRunnerDeps()).execute();
}
// c8 ignore stop
