// FILE-PATH: packages/compile/src/index.ts

/**
 * @module @pendex/compile
 *
 * Public entry point for the `@pendex/compile` package:
 *
 *      `Compile` command
 *      `CompileView` renderer
 *      `CompileService` functions (`runCompile`, `compileJob`, etc.)
 */

export { Compile } from './Compile';

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
    type InitializedCompileJob
} from './CompileService';

export { CompileView } from './CompileView';
