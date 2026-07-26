// diagnose-glob.ts — run once with: bun diagnose-glob.ts
// Prints exactly what Bun.Glob('**/') returns for a nested empty
// directory, so we know for certain instead of guessing. Safe to
// delete after running.

import { mkdirSync, rmSync } from 'node:fs';

const DIR = './diagnose-glob-sandbox';
rmSync(DIR, { recursive: true, force: true });
mkdirSync(`${DIR}/src/nested-empty`, { recursive: true });
mkdirSync(`${DIR}/empty-one`, { recursive: true });
Bun.write(`${DIR}/src/a.ts`, 'a');

console.log('--- Bun.Glob("**/").scan({ onlyFiles: false }) ---');
for await (const dir of new Bun.Glob('**/').scan({ cwd: DIR, onlyFiles: false, dot: true })) {
    console.log(JSON.stringify(dir));
}

console.log('\n--- Bun.Glob("**/*").scan({ onlyFiles: false }) ---');
for await (const entry of new Bun.Glob('**/*').scan({ cwd: DIR, onlyFiles: false, dot: true })) {
    console.log(JSON.stringify(entry));
}

rmSync(DIR, { recursive: true, force: true });
