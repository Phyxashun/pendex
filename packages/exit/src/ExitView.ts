// FILE-PATH: packages/exit/src/ExitView.ts
//
import { outro } from '@clack/prompts';
import { View, type State } from '@pendex/core';

export class ExitView extends View {
    private readonly STRINGS = {
        goodbye: '👋 Exiting @pendex. System process ended.',
    } as const;

    constructor(state: State) {
        super(state);
    }

    public override async render(): Promise<void> {
        // Format exit message
        const goodbye: string = this.state.theme.primary.muted(
            this.STRINGS.goodbye,
        );

        outro(goodbye);
    }
}
