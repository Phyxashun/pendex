/**
 * @module @pendex/core
 *
 * Public entry point for the `@pendex/core` package: shared domain
 * types, path/constant helpers, the archive on-disk format, file
 * scanning, the base `View` class, `ConfigManager`, and the
 * `bootstrap.resolveRunnerDeps()` composition helper used by every
 * Pendex entry point (CLI shell, compile, split).
 */

// FILE-PATH: packages/core/src/index.ts
export * from './types';
export { baseName, Constants, dirName, extName, joinPath } from './Constants';
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
export { identity, View } from './View';
export { assignKey, ConfigManager } from './Config';
export { resolveRunnerDeps, type ResolvedDeps } from './bootstrap';
