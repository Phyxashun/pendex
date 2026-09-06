// FILE-PATH: packages/compile/src/CompileView.ts

/**
 * @module CompileView
 *
 * Single responsibility: render the compile flow to the terminal — the
 * only `@clack/prompts` caller for `compile`.
 *
 * A VIEW OWNS ITS WHOLE CLACK SESSION, intro THROUGH outro. Every exit
 * path here (success, error) closes the session with `outro()`. This is
 * what fixes the dangling-session look when Compile runs standalone —
 * previously the outro lived nowhere (bandaid: in the Command, which
 * put presentation in the wrong layer). Inside the interactive shell
 * this is also correct: each command render is its own complete clack
 * session, and `Application` clears the console between sessions anyway.
 */

import type { NoteOptions, Task } from '@clack/prompts';
import { intro, log, note, outro, tasks } from '@clack/prompts';
import { Colors } from '@pendex/color';
import type { Config, Job, State, StyleFunction, Theme } from '@pendex/core';
import { View } from '@pendex/core';
import type { CompileJobContext, CompileJobResult } from './CompileService';
import {
    compileSingleJob,
    finalizeCompile,
    initializeCompile,
} from './CompileService';

export interface ResultSummary {
    outputDir: string;
    fileCount: string;
    jobCount: string;
}

/**
 * Renders the interactive compile session: intro, per-job progress,
 * summary, and outro.
 */
export class CompileView extends View {
    // User-facing strings for this view.
    private readonly STRINGS = {
        title: '  RUNNING PENDEX COMPILATION ',
        excludedTitle: 'Excluded Patterns',
        presentAction: 'Compiling',
        pastAction: 'compiled',

        resultTitle: 'Compilation Results',
        resultDir: 'Files created in',
        resultTotal: 'Total files compiled',
        resultJobs: 'Total jobs compiled',

        error: 'Failed to compile project files.',
        outroSuccess: 'Compilation complete',
        outroFailure: 'Compilation failed — see errors above',
    } as const;

    private totalFiles: number = 0;

    constructor(state: State) {
        super(state);
    }

    /**
     * Runs and renders the full compile session, from intro to outro.
     */
    public override render = async (): Promise<void> => {
        const theme: Theme = this.state.theme;
        const config: Config = this.state.config;

        try {
            // Initialize compilation assets
            const ctx: CompileJobContext = await initializeCompile(config);

            intro(`${theme.title(this.STRINGS.title)}`);

            this.renderExcludes(ctx.excludes.join(', '));

            // Build tasks that execute live service methods inside Clack's runner
            const jobTasks: Task[] = await this.buildJobTasks(ctx);

            // Clack runs tasks one-by-one, showing live spinner progress
            await tasks(jobTasks);

            // Write manifest and clean up folders
            await finalizeCompile(config, ctx);

            // Render final summary block
            this.renderSummary(this.totalFiles);

            const success: string = `${this.STRINGS.outroSuccess.toUpperCase()}`;
            log.success(Colors.bgGreen(Colors.black(success)));
        } catch (err: unknown) {
            log.error(`${theme.error(this.STRINGS.error)}`);
            if (err instanceof Error) log.error(`${theme.error(err.message)}`);
            outro(Colors.bgRed(Colors.black(this.STRINGS.outroFailure)));
        }
    };

    private buildJobTasks = async (ctx: CompileJobContext): Promise<Task[]> => {
        const theme: Theme = this.state.theme;
        const config: Config = this.state.config;

        return config.jobs.map((job: Job): Task => {
            const rawDesc: string = job.description || job.filename;
            const titleStyle: StyleFunction = this.categoryStyle(
                job.category,
                theme.bold,
            );
            const resultStyle: StyleFunction = this.categoryStyle(
                job.category,
                theme.primary,
            );

            return {
                title: `${this.STRINGS.presentAction} ${titleStyle(rawDesc)}`,
                task: async (): Promise<string> => {
                    const outcome: CompileJobResult = await compileSingleJob(
                        job,
                        {
                            ...config,
                            ...ctx,
                        },
                    );

                    const warningCount: string = `${theme.warning(`${outcome.fileCount}`)}`;
                    const styledCount: string = `${theme.bold(warningCount)}`;

                    const rawDesc1: string = `${rawDesc.charAt(0).toUpperCase()}`;
                    const rawDesc2: string = `${rawDesc.slice(1).toLowerCase()}`;
                    const combinedDesc: string = `${rawDesc1}${rawDesc2} ${this.STRINGS.pastAction}`;
                    const formattedDesc: string = `${resultStyle(combinedDesc)}`;

                    this.totalFiles += outcome.fileCount;
                    return `${styledCount} ${formattedDesc}`;
                },
            };
        });
    };

    private renderExcludes = (excludes: string): void => {
        const message: string = excludes;
        const title: string = this.STRINGS.excludedTitle;
        const options: NoteOptions = {
            format: this.mutedFormatter,
        };

        note(message, title, options);
    };

    /**
     * Renders the post-compile summary note (output dir, file count,
     * job count).
     *
     * @param fileCount - Total files compiled across all jobs.
     */
    private renderSummary = (fileCount: number): void => {
        const config: Config = this.state.config;

        const rawResult: ResultSummary = {
            outputDir: this.directoryFormatter(config.outputDir),
            fileCount: this.numberFormatter(fileCount),
            jobCount: this.numberFormatter(config.jobs.length),
        };

        const result: ResultSummary = {
            outputDir: `${this.STRINGS.resultDir}: ${rawResult.outputDir}`,
            fileCount: `${this.STRINGS.resultTotal}: ${rawResult.fileCount}`,
            jobCount: `${this.STRINGS.resultJobs}: ${rawResult.jobCount}`,
        };

        const message: string = `${result.outputDir}\n${result.fileCount}\n${result.jobCount}`;
        const title: string = `${this.STRINGS.resultTitle}`;
        const options: NoteOptions = {
            format: this.successFormatter,
        };

        note(message, title, options);
    };

    private mutedFormatter = (text: string): string =>
        `${this.state.theme.muted(text)}`;

    private successFormatter = (text: string): string =>
        `${this.state.theme.success(text)}`;

    private directoryFormatter = (text: string): string =>
        `${this.state.theme.warning(`"/${text}"`)}`;

    private numberFormatter = (number: number): string =>
        `${this.state.theme.bold.primary(String(number))}`;
}
