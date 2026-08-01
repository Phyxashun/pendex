/**
 * @module Exit
 *
 * Single responsibility: say goodbye and terminate the process. Still
 * deliberately NOT split into command + service + view — one `outro()`
 * and a `process.exit()` don't earn three files. Note: this outro closes
 * the SHELL's clack session (the menu `Application` opened); the
 * per-command sessions close themselves inside their views.
 */

import { outro } from '@clack/prompts';
import type { Command, ExitState } from '@pendex/core';

/** The "Exit Program" command: prints a goodbye message and terminates the process. */
export class Exit implements Command {
    readonly key: string;
    readonly label: string;
    readonly hint: string;

    private readonly state: ExitState;

    /**
     * @param state - Shared application state plus the `exit` function used to terminate the process.
     */
    constructor(state: ExitState) {
        this.state = state;

        this.key = 'exit';
        this.label = `${this.state.theme('Exit Program').secondary}`;
        this.hint = `${this.state.theme('Terminate CLI process').secondary}`;
    }

    /** Closes the shell's clack session with a goodbye message and terminates via `state.exit` (or `process.exit` as a fallback). */
    async execute(): Promise<void> {
        const goodbyeMsg = 'Exiting CLI tool. System process ended.';

        // Was hand-drawn with console.log('│'), console.log('└  ' + msg) —
        // reinventing clack's own box-drawing instead of using it. outro()
        // is the correct call here anyway: this closes the SHELL's clack
        // session (the menu Application opened), same as every other
        // view's outro() call.
        outro(`${this.state.theme(goodbyeMsg).primary.muted}`);

        // Was `this.state.exit() ?? process.exit(0)` — that CALLS exit()
        // first (with no args, not 0) and, being void-returning, always
        // ALSO fires the real process.exit(0) via `??`, even when a test
        // mock is injected. `??` must pick a function reference, not a
        // call result, and be invoked exactly once.
        (this.state.exit ?? process.exit)(0);
    }
}
