// FILE-PATH: packages/core/src/index.ts

/**
 * @module @pendex/core
 *
 * Public entry point for the `@pendex/core` package: shared domain
 * types, path/constant helpers, the archive on-disk format, file
 * scanning, the base `View` class, `ConfigManager`, and the
 * `bootstrap.resolveRunnerDeps()` composition helper used by every
 * Pendex entry point (CLI shell, compile, split).
 */

export * from './types';

export {
    Constants,
    baseName,
    dirName,
    extName,
    joinPath,
    normalizePath,
    toPosixPath,
} from './Constants';

export {
    archivePathFor,
    buildArchiveEntry,
    joinArchiveEntries,
    parseArchive,
    type ArchivedFile,
} from './ArchiveFormat';

export {
    findEmptyDirectories,
    loadIgnorePatterns,
    resolveJobFiles,
} from './FileScanner';

export { View, identity } from './View';

export { ConfigManager, assignKey } from './Config';

export {
    extractCategoryColors,
    resolveRunnerDeps,
    type ResolvedDeps,
} from './bootstrap';
