//
// SINGLE RESPONSIBILITY: say goodbye and terminate the process. Still
// deliberately NOT split into command + service + view — one outro()
// and a process.exit() don't earn three files. Note: this outro closes
// the SHELL's clack session (the menu Application opened); the
// per-command sessions close themselves inside their views.

import type { Command, ExitState } from '@pendex/core';

export class Exit implements Command {
    readonly key: string;
    readonly label: string;
    readonly hint: string;

    private readonly state: ExitState;

    constructor(state: ExitState) {
        this.state = state;

        this.key = 'exit';
        this.label = `${this.state.theme('Exit Program').secondary}`;
        this.hint = `${this.state.theme('Terminate CLI process').secondary}`;
    }

    async execute(): Promise<void> {
        const newLine = this.state.theme('│').muted;
        const prepend = this.state.theme('└  ').muted;
        const goodbyeMsg = 'Exiting CLI tool. System process ended.';
        const goodbye = this.state.theme(goodbyeMsg).primary.muted;

        console.log(`${newLine}`);
        console.log(`${prepend}${goodbye}`);

        // Was `this.state.exit() ?? process.exit(0)` — that CALLS exit()
        // first (with no args, not 0) and, being void-returning, always
        // ALSO fires the real process.exit(0) via `??`, even when a test
        // mock is injected. `??` must pick a function reference, not a
        // call result, and be invoked exactly once.
        (this.state.exit ?? process.exit)(0);
    }
}
