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
import { View } from '@pendex/core';

/**
 * The "Exit Program" command: prints a goodbye message and terminates
the process.
 */
export class Exit extends View implements Command {
    readonly key: string;
    readonly label: string;
    readonly hint: string;

    private readonly STRINGS: Record<string, string> = {
        key: 'exit',
        label: 'Exit program',
        hint: 'Terminate system process',
        goodbye: '👋 Exiting @pendex. System process ended.'
    } as const;

    constructor(state: ExitState) {
        super(state);

        this.key = this.STRINGS.key;
        this.label = `${this.state.theme.secondary(this.STRINGS.label)}`;
        this.hint = `${this.state.theme.secondary(this.STRINGS.hint)}`;
    }

    /**
     * Prints the goodbye message and terminates the process via
     * `state.exit` (or `process.exit` as a fallback).
     */
    public async execute(): Promise<void> {
        await this.render();
        (this.state.exit ?? process.exit)(0);
    }

    public override async render(): Promise<void> {
        const theme: Theme = this.state.theme;
        const goodbye: string = theme.primary.muted(this.STRINGS.goodbye);
        outro(goodbye);
    }
}
