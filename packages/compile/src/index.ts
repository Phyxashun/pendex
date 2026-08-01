/**
 * @module @pendex/compile
 *
 * Public entry point for the `@pendex/compile` package: the `Compile`
 * command, its `CompileView` renderer, and the headless
 * `CompileService` functions (`runCompile`, `compileJob`, etc.) that
 * back both the interactive and standalone/test call paths.
 */

// FILE-PATH: packages/compile/src/index.ts
export { Compile } from './Compile';
export { CompileView } from './CompileView';
export {
    compileJob,
    compileSingleJob,
    finalizeCompile,
    initializeCompile,
    prepareOutputDirectory,
    resolveExcludes,
    runCompile,
    writeManifest,
    type CompileHooks,
    type CompileJob,
    type CompileJobResult,
    type CompileSummary,
    type InitializedCompileJob,
} from './CompileService';
