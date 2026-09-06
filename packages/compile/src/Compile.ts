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
import { CompileView } from './CompileView';

/**
 * The "Compile Codebase" command:
 * consolidates project files per the active config's jobs.
 */
export class Compile implements Command {
    private readonly state: State;
    private readonly view: CompileView;

    readonly key: string;
    readonly label: string;
    readonly hint: string;

    private readonly STRINGS = {
        key: 'compile',
        label: 'Compile project',
        hint: 'Consolidates project files',
    } as const;

    constructor(state: State) {
        this.state = state;
        this.view = new CompileView(this.state);

        this.key = this.STRINGS.key;
        this.label = `${this.state.theme.secondary(this.STRINGS.label)}`;
        this.hint = `${this.state.theme.secondary(this.STRINGS.hint)}`;
    }

    /**
     * Runs the compile command by delegating to its {@link CompileView}.
     */
    async execute(): Promise<void> {
        await this.view.render();
    }
}
