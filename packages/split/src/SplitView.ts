// FILE-PATH: src/views/SplitView.ts
//
// SINGLE RESPONSIBILITY: render the split flow to the terminal — the
// only @clack/prompts caller for `split`. Owns its whole clack session:
// every exit path (success, missing manifest, error) closes with
// outro(), so a standalone run never leaves the session dangling.
//
// REAL LIVE PROGRESS, NOT A REPLAY. The previous version drove this
// through SplitHooks passed into runSplit(): onFileStart/onFileSuccess
// fired *inside* runSplit's own loop, which meant every file was already
// split by the time control returned here — the later `tasks()` call had
// no real async work left to do, just canned strings replayed through a
// spinner. It also tried to smuggle each result back out by assigning a
// property onto the `filename` string parameter (`(filename as
// any).__clackResult = ...`) — filename is a primitive, so that write
// autoboxes a throwaway wrapper and never persists; every task rendered
// blank. Calling splitSingleFile() *inside* each task() callback below
// fixes both problems at once: the disk work and the spinner are
// genuinely synchronized (matches CompileView's pattern), and each
// task's own closure holds its own result — nothing needs smuggling
// through a shared mutable key, and there's no `any` anywhere.

import { intro, log, note, outro, tasks } from '@clack/prompts';
import { initializeSplit, splitSingleFile } from './SplitService';
import type { State } from '@pendex/core';
import { View } from '@pendex/core';

export class SplitView extends View {
    private readonly STRINGS = {
        title: 'RUNNING PENDEX SPLIT',
        excludedTitle: 'Excluded Patterns',
        presentAction: 'Splitting from',
        noManifest: 'No manifest found in',
        pleaseCompile: 'Please compile first.',
        success: 'Entire directory state restored inside',
        error: 'Splitting sequence crashed.',
        missingSource: 'Source .txt file not found, skipping.',
        filesRecreated: 'files recreated from this archive.',
        totalLabel: 'Total files recreated',
        outroSuccess: 'Split complete.',
        outroNoManifest: 'Nothing to split.',
        outroFailure: 'Split failed — see errors above.',
    } as const;

    constructor(state: State) {
        // Forward `state` whole — see CompileView.ts / View.ts for why.
        super(state);
    }

    public override async render(): Promise<void> {
        const { theme, config } = this.state;
        const { outputDir, rebuiltDir, exclude } = config;

        intro(`${theme.title(this.STRINGS.title)}`);

        try {
            // Reads the manifest and — only if found — wipes/recreates
            // rebuiltDir and restores its recorded empty directories.
            // No per-file splitting has happened yet at this point.
            const ctx = await initializeSplit(outputDir, rebuiltDir);

            if (!ctx) {
                log.error(`${theme.error(`${this.STRINGS.noManifest} /${outputDir}. ${this.STRINGS.pleaseCompile}`)}`);
                outro(`${theme.muted(this.STRINGS.outroNoManifest)}`);
                return;
            }

            note(
                exclude.join(', '),
                this.STRINGS.excludedTitle,
                { format: (text: string) => `${theme.muted(text)}` }
            );

            let totalRecreated = 0;

            // splitSingleFile runs INSIDE task() — the real work and the
            // spinner are the same operation, not a replay of one.
            const fileTasks = Object.keys(ctx.manifest.files).map((filename) => {
                const category = ctx.manifest.categories?.[filename];
                const titleStyle = category ? this.categoryStyle(category, theme.bold) : theme.bold;

                return {
                    title: `${this.STRINGS.presentAction} ${titleStyle(filename)}`,
                    task: async (): Promise<string> => {
                        const outcome = await splitSingleFile(outputDir, rebuiltDir, filename);

                        if (!outcome.archiveFound) {
                            return `${theme.muted(this.STRINGS.missingSource)}`;
                        }

                        totalRecreated += outcome.filesRecreated;
                        const styledCount = `${theme.bold(theme.warning(outcome.filesRecreated.toString()))}`;
                        return `${styledCount} ${theme.primary(this.STRINGS.filesRecreated)}`;
                    },
                };
            });

            await tasks(fileTasks);

            const styledTotal = `${theme.bold(theme.warning(totalRecreated.toString()))}`;
            const styledRebuiltDir = `${theme.muted('/' + rebuiltDir)}`;
            const success = `${theme.success(`${this.STRINGS.success} ${styledRebuiltDir}.`)}`;
            const finalCount = `${theme.success(this.STRINGS.totalLabel)}: ${styledTotal}`;

            log.step(`${success}`);
            log.success(`${finalCount}`);
            outro(`${theme.success(this.STRINGS.outroSuccess)}`);
        } catch (err) {
            log.error(`${theme.error(this.STRINGS.error)}`);
            if (err instanceof Error) {
                log.error(`${theme.error(err.message)}`);
            }
            outro(`${theme.error(this.STRINGS.outroFailure)}`);
        }
    }
}
