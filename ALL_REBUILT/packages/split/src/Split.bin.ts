// FILE-PATH: packages/split/src/Split.bin.ts
//
import type { ResolvedDeps, StandaloneExecution } from '@pendex/core';
import { Exit } from '@pendex/exit';
import { Split } from './Split';

/**
 * STANDALONE EXECUTION ENTRY POINT
 * `bun run packages/split/src/Split.bin.ts` —
 * only pulls a Config, no App/State required.
 */
const standaloneExecution: StandaloneExecution = async (): Promise<void> => {
    console.log();

    const { resolveRunnerDeps } = await import('@pendex/core');
    const state: ResolvedDeps = await resolveRunnerDeps();

    const split = new Split(state);
    await split.execute();

    const exit = new Exit({
        ...state,
        exit: process.exit.bind(process),
        exitCode: 0,
    });
    await exit.execute();
};

if (import.meta.main) {
    await standaloneExecution();
}
