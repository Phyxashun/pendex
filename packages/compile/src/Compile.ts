// FILE-PATH: packages/compile/src/Compile.ts

/**
 * @module Compile
 *
 * Single responsibility: satisfy `Command` for "compile" — hold its
 * menu identity (key/label/hint) and hand its deps to `CompileView`. No
 * rendering happens here: the outro that used to be bandaided into this
 * file now lives where the rest of the clack session lives, in
 * `CompileView` (a view owns intro THROUGH outro). Construction only
 * needs a `Config`, which keeps it standalone-runnable.
 */

import type { Command, State } from '@pendex/core';
import { Exit } from '@pendex/exit';
import { CompileView } from './CompileView';

/**
 * The "Compile Codebase" command:
 * consolidates project files per the active config's jobs.
 */
export class Compile implements Command {
    readonly key = 'compile';
    readonly label = 'Compile project';
    readonly hint = 'Consolidates project files';

    private readonly state: State;
    private readonly view: CompileView;

    constructor(state: State) {
        this.state = state;
        this.view = new CompileView(this.state);
    }

    /**
     * Runs the compile command by delegating to its {@link CompileView}.
     */
    async execute(): Promise<void> {
        await this.view.render();
    }
}

/**
 * STANDALONE EXECUTION ENTRY POINT
 * `bun run src/commands/Compile.ts` — only pulls a Config, no
App/State required.
 */
// c8 ignore start
if (import.meta.main) {
    console.log();

    const { resolveRunnerDeps } = await import('@pendex/core');
    const state: State = await resolveRunnerDeps();

    const compile = await new Compile(state);
    await compile.execute();

    const exit: Exit = await new Exit({ ...state, exit: process.exit });
    await exit.execute();
}
// c8 ignore stop
