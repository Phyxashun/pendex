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

import { intro, log, note, outro, tasks } from '@clack/prompts';
import type { State } from '@pendex/core';
import { View } from '@pendex/core';
import { compileSingleJob, finalizeCompile, initializeCompile } from './CompileService';

/** Renders the interactive compile session: intro, per-job progress, summary, and outro. */
export class CompileView extends View {
    /** User-facing copy for this view's clack session. */
    private readonly STRINGS = {
        title: 'RUNNING PENDEX COMPILATION',
        excludedTitle: 'Excluded Patterns',
        presentAction: 'Compiling',
        pastAction: 'compiled',
        success: 'Total project files successfully compiled!',
        complete: 'Entire project compiled inside',
        total: 'Total files compiled',
        error: 'Failed to compile project files.',
        result: 'Compilation Results',
        outroSuccess: 'Compilation complete.',
        outroFailure: 'Compilation failed — see errors above.',
    } as const;

    /**
     * @param state - Shared application state (theme, config, category colors) to render against.
     */
    constructor(state: State) {
        // Forward `state` whole — rebuilding a {theme, config} literal
        // here (the previous version) silently dropped categoryColors,
        // since it was never one of the two fields being copied. See
        // View.ts's constructor comment for the full story.
        super(state);
    }

    /** Runs and renders the full compile session, from intro to outro. */
    public override async render(): Promise<void> {
        const { theme, config } = this.state;
        let totalFiles = 0;

        try {
            // Initialize compilation assets
            const ctx = await initializeCompile(config);

            console.log();
            intro(`${theme(this.STRINGS.title).title}`);

            note(
                ctx.excludes.join(', '),
                this.STRINGS.excludedTitle,
                {
                    format: (text: string) => `${theme.muted(text)}`
                }
            );

            // Build tasks that execute live service methods inside Clack's runner
            const jobTasks = config.jobs.map((job) => {
                const rawDesc = job.description || job.filename;
                const titleStyle = this.categoryStyle(job.category, theme.bold);
                const resultStyle = this.categoryStyle(job.category, theme.primary);

                return {
                    title: `${this.STRINGS.presentAction} ${titleStyle(rawDesc)}`,
                    task: async (): Promise<string> => {
                        const outcome = await compileSingleJob(job, { config, ...ctx });

                        totalFiles += outcome.fileCount;

                        const rawDesc1 = `${rawDesc.charAt(0).toUpperCase()}`;
                        const rawDesc2 = `${rawDesc.slice(1).toLowerCase()}`;
                        const formattedDesc = resultStyle(`${rawDesc1}${rawDesc2} ${this.STRINGS.pastAction}`);
                        // theme.warning(...) must be coerced to a plain string
                        // with its own template literal BEFORE being handed to
                        // theme.bold(...) as an argument — passing its raw
                        // return value directly (the old
                        // `theme.bold(theme.warning(x))`) fed the chaining
                        // engine's not-yet-primitive result back into itself,
                        // which is what triggered "Symbol.toPrimitive
                        // returned an object". Every other themed value in
                        // this codebase already follows the coerce-
                        // immediately convention; this was the one place
                        // that didn't.
                        const warningCount = `${theme.warning(`${outcome.fileCount}`)}`;
                        const styledCount = `${theme.bold(warningCount)}`;

                        return `${styledCount} ${formattedDesc}`;
                    }
                };
            });

            // Clack runs these one-by-one, showing live spinner progress
            await tasks(jobTasks);

            // Write manifest and clean up folders
            await finalizeCompile(config, ctx);

            // Render final summary block
            this.renderSummary(totalFiles);
            outro(`${theme.success(this.STRINGS.outroSuccess)}`);

        } catch (err) {
            log.error(`${theme.error(this.STRINGS.error)}`);
            if (err instanceof Error) log.error(`${theme.error(err.message)}`);
            outro(`${theme.error(this.STRINGS.outroFailure)}`);
        }
    }

    /**
     * Renders the post-compile summary note (output dir, file count, job count).
     *
     * @param fileCount - Total files compiled across all jobs.
     */
    private renderSummary(fileCount: number): void {
        const theme = this.state.theme;

        const results = {
            outputDir: theme.warning(`"/${this.state.config.outputDir}"`),
            fileCount: theme.bold.primary(String(fileCount)),
            jobCount: theme.bold.primary(String(this.state.config.jobs.length))
        }

        const complete = `${theme.success(`${this.STRINGS.complete}: ${results.outputDir}`)}`;
        const total = `${theme.success(`${this.STRINGS.total} ${results.fileCount}`)}`;
        const success = `${theme.success(`${this.STRINGS.success}: ${results.jobCount}`)}`;

        const message = `${complete}\n${total}\n${success}`
        const title = ` ${this.STRINGS.result} `;

        note(
            message,
            title,
            {
                format: (text: string) => `${theme.success(text)}`
            }
        );
    }
}
