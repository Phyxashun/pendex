//
// SINGLE RESPONSIBILITY: satisfy Command for "compile" — hold its menu
// identity (key/label/hint) and hand its deps to CompileView. No
// rendering happens here: the outro that used to be bandaided into this
// file now lives where the rest of the clack session lives, in
// CompileView (a view owns intro THROUGH outro). Construction only
// needs a Config, which keeps it standalone-runnable.

import type { Command, State } from '@pendex/core';
import { CompileView } from './CompileView';

export class Compile implements Command {
    readonly key = 'compile';
    readonly label = 'Compile Codebase';
    readonly hint = 'Consolidates project files';

    private readonly state: State;

    private readonly view: CompileView;

    constructor(state: State) {
        this.state = state;
        this.view = new CompileView(this.state);
    }

    async execute(): Promise<void> {
        await this.view.render();
    }
}

/**
 * STANDALONE EXECUTION ENTRY POINT
 * `bun run src/commands/Compile.ts` — only pulls a Config, no App/State required.
 */
// c8 ignore start
if (import.meta.main) {
    const { resolveRunnerDeps } = await import('@pendex/core');
    await new Compile(await resolveRunnerDeps()).execute();
}
// c8 ignore stop
