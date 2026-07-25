// FILE-PATH: packages/core/tests/preload.ts
//
// Redirects Constants.RUNTIME_CONFIG_PATH into a sandbox dir for the
// whole @pendex/core test run. Constants.BASE_DIR is computed once at
// module-first-import time (process.cwd() at that instant), so a plain
// process.chdir() in a test's beforeEach can't retroactively change it —
// mocking the whole module at the package-entry specifier is what lets
// every test file that does `import { Constants } from '../src'` see
// the sandboxed path regardless of import order.

import { mock } from 'bun:test';
import * as OriginalCore from '../src';

const SANDBOX_DIR = './test-sandbox';
const RUNTIME_CONFIG_PATH = `${process.cwd()}/${SANDBOX_DIR}/runtime.config.json`;

mock.module('../src', () => ({
    ...OriginalCore,
    Constants: {
        ...OriginalCore.Constants,
        RUNTIME_CONFIG_PATH,
    },
}));
