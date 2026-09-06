// FILE-PATH: packages/exit/src/Exit.ts
//
/**
 * @module Exit
 *
 * Single responsibility: say goodbye and terminate the process. Still
 * deliberately NOT split into command + service + view — one `outro()`
 * and a `process.exit()` don't earn three files. Note: this outro closes
 * the SHELL's clack session (the menu `Application` opened); the
 * per-command sessions close themselves inside their views.
 */

import type { Command, ExitState } from '@pendex/core';
import { ExitView } from './ExitView';

/**
 * The "Exit Program" command: prints a goodbye message and terminates
 * the process.
 */
export class Exit implements Command {
    private readonly state: ExitState;
    private readonly view: ExitView;

    public readonly key: string;
    public readonly label: string;
    public readonly hint: string;

    private readonly STRINGS = {
        key: 'exit',
        label: 'Exit program',
        hint: 'Terminate system process',
    } as const;

    constructor(state: ExitState) {
        this.state = state;
        this.view = new ExitView(this.state);

        this.key = this.STRINGS.key;
        this.label = `${this.state.theme.secondary(this.STRINGS.label)}`;
        this.hint = `${this.state.theme.secondary(this.STRINGS.hint)}`;
    }

    /**
     * Prints the goodbye message and terminates the process via
     * `state.exit` (or `process.exit` as a fallback).
     */
    public async execute(): Promise<void> {
        await this.view.render();

        const code: number = this.state.exitCode;

        if (this.state.exit) {
            this.state.exit(code);
        } else {
            process.exit(code);
        }
    }
}
