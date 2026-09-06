// packages/core/src/Service.ts
// FILE-PATH: packages/core/src/Service.ts

/**
 * @module Service
 *
 * Single responsibility: the shared run() lifecycle every command-level
 * service follows — prepare output, resolve items, process each one
 * with hooks, produce a summary. Compile/Split subclasses supply only
 * what's actually different between them: how to resolve items, how to
 * process one, and how to fold outcomes into a summary.
 */

/**
 * Lifecycle hooks a caller (e.g. an interactive CLI view) can observe
 * during a run. Generic over the per-item type and its outcome so
 * Compile (Job -> CompileJobResult) and Split (filename -> SplitFileOutcome)
 * both get properly-typed callbacks instead of `unknown`.
 */
export interface ServiceHooks<TItem, TOutcome> {
    // Called once, before any item is processed.
    onRunStart?: () => void | Promise<void>;
    // Called before an item starts processing.
    onItemStart?: (item: TItem) => void | Promise<void>;
    // Called after an item finishes processing successfully.
    onItemSuccess?: (item: TItem, outcome: TOutcome) => void | Promise<void>;
    // Called once, after every item has run.
    onRunSuccess?: (summary: unknown) => void | Promise<void>;
}

/**
 * Abstract base for a run() lifecycle shared by every command-level
 * service. `TItem` is what gets iterated (a Job, a filename); `TOutcome`
 * is the per-item result; `TSummary` is the full-run result handed back
 * to the caller.
 *
 * Subclasses own nothing about *how* iteration or hooks are sequenced —
 * only the three things that are actually different per-command:
 * resolving the item list, processing one item, and folding outcomes
 * into a summary.
 */
export abstract class Service<TItem, TOutcome, TSummary> {
    /**
     * Optional hooks for this run, set once via {@link run}.
     */
    protected hooks: ServiceHooks<TItem, TOutcome> = {};

    /**
     * Resolves the ordered list of items this run will process
     * (e.g. Compile's Jobs, Split's manifest filenames).
     */
    protected abstract resolveItems(): Promise<TItem[]>;

    /**
     * Processes exactly one item and returns its outcome. Never calls
     * hooks itself — {@link run} owns hook sequencing so subclasses
     * can't accidentally skip or double-fire one.
     */
    protected abstract processItem(item: TItem): Promise<TOutcome>;

    /**
     * Any one-time setup before items are resolved/processed
     * (e.g. wiping and recreating an output directory). Defaults to a
     * no-op — not every service needs one.
     */
    protected async prepare(): Promise<void> {}

    /**
     * Folds all per-item outcomes (plus anything a subclass tracked
     * along the way) into the final summary handed back to the caller.
     */
    protected abstract buildSummary(outcomes: TOutcome[]): Promise<TSummary>;

    /**
     * Runs the full lifecycle: prepare -> resolve items -> process each
     * with hooks -> build summary. This is the one place iteration and
     * hook sequencing happen — subclasses never loop or call hooks
     * themselves, so Compile and Split can't drift out of sync on how
     * a run is sequenced.
     *
     * @param hooks - Optional progress callbacks for this run.
     * @returns The full {@link TSummary} for this run.
     */
    public async run(hooks?: ServiceHooks<TItem, TOutcome>): Promise<TSummary> {
        this.hooks = hooks ?? {};

        await this.prepare();

        if (this.hooks.onRunStart) {
            await this.hooks.onRunStart();
        }

        const items: TItem[] = await this.resolveItems();
        const outcomes: TOutcome[] = [];

        for (const item of items) {
            if (this.hooks.onItemStart) {
                await this.hooks.onItemStart(item);
            }

            const outcome: TOutcome = await this.processItem(item);
            outcomes.push(outcome);

            if (this.hooks.onItemSuccess) {
                await this.hooks.onItemSuccess(item, outcome);
            }
        }

        const summary: TSummary = await this.buildSummary(outcomes);

        if (this.hooks.onRunSuccess) {
            await this.hooks.onRunSuccess(summary);
        }

        return summary;
    }
}
