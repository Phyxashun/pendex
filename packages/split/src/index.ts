// FILE-PATH: packages/split/src/index.ts

/**
 * @module @pendex/split
 *
 * Public entry point for the `@pendex/split` package: the `Split`
 * command, its `SplitView` renderer, and the headless `SplitService`
 * functions (`runSplit`, `splitArchiveFile`, etc.) that back both the
 * interactive and standalone/test call paths.
 */

export {
    Split
} from './Split';

export {
    initializeSplit,
    prepareRebuildDirectory,
    readManifest,
    restoreEmptyDirectories,
    runSplit,
    splitArchiveFile,
    splitSingleFile,
    type SplitFileOutcome,
    type SplitHooks,
    type SplitSummary
} from './SplitService';

export {
    SplitView
} from './SplitView';
