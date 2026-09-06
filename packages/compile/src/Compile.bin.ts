// FILE-PATH: packages/compile/src/Compile.bin.ts
//
import type { ResolvedDeps, StandaloneExecution } from '@pendex/core';
import { Exit } from '@pendex/exit';
import { Compile } from './Compile';

/**
 * STANDALONE EXECUTION ENTRY POINT
 * `bun run src/commands/Compile.ts` — only pulls a Config, no
 * App/State required.
 */
const standaloneExecution: StandaloneExecution = async (): Promise<void> => {
    console.log();

    const { resolveRunnerDeps } = await import('@pendex/core');
    const state: ResolvedDeps = await resolveRunnerDeps();

    const compile = new Compile(state);
    await compile.execute();

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
