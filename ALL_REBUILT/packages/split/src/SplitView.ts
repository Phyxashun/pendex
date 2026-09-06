// FILE-PATH: packages/split/src/SplitView.ts

/**
 * @module SplitView
 * @file FILE-PATH: src/views/SplitView.ts
 *
 * Single responsibility: render the split flow to the terminal — the
 * only `@clack/prompts` caller for `split`. Owns its whole clack
 * session: every exit path (success, missing manifest, error) closes
 * with `outro()`, so a standalone run never leaves the session
 * dangling.
 */

import { intro, log, note, outro, tasks, type Task } from '@clack/prompts';
import { Colors } from '@pendex/color';
import type { Config, Manifest, State, Theme } from '@pendex/core';
import { View } from '@pendex/core';
import { initializeSplit, splitSingleFile } from './SplitService';

/**
 * Renders the interactive split session: intro, per-file progress,
 * summary, and outro.
 */
export class SplitView extends View {
    // User-facing strings for this view.
    private readonly STRINGS = {
        title: ' 󰏖 RUNNING PENDEX SPLIT ',
        excludedTitle: 'Excluded Patterns',
        presentAction: 'Splitting from',
        noManifest: 'No manifest found in',
        pleaseCompile: 'Please compile first.',
        success: 'Entire directory state restored inside',
        error: 'Splitting sequence crashed.',
        missingSource: 'Source .txt file not found, skipping.',
        filesRecreated: 'files recreated from this archive.',
        totalLabel: 'Total files recreated',
        outroSuccess: 'Split complete',
        outroNoManifest: 'Nothing to split.',
        outroFailure: 'Split failed — see errors above',
    } as const;

    constructor(state: State) {
        super(state);
    }

    /**
     * Runs and renders the full split session, from intro to outro.
     */
    public override async render(): Promise<void> {
        const theme: Theme = this.state.theme;
        const config: Config = this.state.config;

        const outputDir: string = config.outputDir;
        const rebuiltDir: string = config.rebuiltDir;
        const exclude: string[] = config.exclude;

        intro(theme.title(this.STRINGS.title));

        try {
            const manifest: Manifest | null = await initializeSplit(
                outputDir,
                rebuiltDir,
            );

            if (!manifest) {
                log.error(
                    `${theme.error(`${this.STRINGS.noManifest} /
${outputDir}. ${this.STRINGS.pleaseCompile}`)}`,
                );
                outro(theme.muted(this.STRINGS.outroNoManifest));
                return;
            }

            if (exclude.length > 0) {
                note(exclude.join(', '), this.STRINGS.excludedTitle, {
                    format: this.mutedFormatter,
                });
            }

            const outcomes: number[] = [];

            const fileTasks: Task[] = Object.keys(manifest.files).map(
                (filename, index) =>
                    this.buildFileTask(filename, index, manifest, outcomes),
            );

            await tasks(fileTasks);

            const totalRecreated = outcomes.reduce(
                (sum, count) => sum + (count || 0),
                0,
            );

            const styledRebuiltDir = theme.muted('/' + rebuiltDir);
            log.step(
                `${theme.success(`${this.STRINGS.success}
${styledRebuiltDir}.`)}`,
            );

            const styledTotal = theme.bold(
                theme.warning(totalRecreated.toString()),
            );
            log.success(
                `${theme.success(this.STRINGS.totalLabel)}: ${styledTotal}`,
            );

            const success = this.STRINGS.outroSuccess.toUpperCase();
            log.success(Colors.bgGreen(Colors.black(success)));
        } catch (err) {
            log.error(theme.error(this.STRINGS.error));
            if (err instanceof Error) {
                log.error(theme.error(err.message));
            }
            outro(theme.error(this.STRINGS.outroFailure));
        }
    }

    /**
     * Builds a single localized execution block formatted for the
     * Clack task pipeline.
     */
    private buildFileTask(
        filename: string,
        index: number,
        manifest: Manifest,
        outcomes: number[],
    ): Task {
        const theme: Theme = this.state.theme;
        const config: Config = this.state.config;

        const category = manifest.categories?.[filename];
        const titleStyle = category
            ? this.categoryStyle(category, theme.bold)
            : theme.bold;

        return {
            title: `${this.STRINGS.presentAction} ${titleStyle(filename)}`,
            task: async (): Promise<string> => {
                const outcome = await splitSingleFile(
                    config.outputDir,
                    config.rebuiltDir,
                    filename,
                );

                if (!outcome.archiveFound) {
                    outcomes[index] = 0;
                    return theme.muted(this.STRINGS.missingSource);
                }

                outcomes[index] = outcome.filesRecreated;
                const styledCount = theme.bold.warning(
                    outcome.filesRecreated.toString(),
                );
                return `${styledCount}
${theme.primary(this.STRINGS.filesRecreated)}`;
            },
        };
    }

    private mutedFormatter = (text: string) =>
        `${this.state.theme.muted(text)}`;
}
