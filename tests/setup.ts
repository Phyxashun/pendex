// FILE-PATH: tests/setup.ts
import { existsSync, mkdirSync, rmSync } from 'node:fs';

export async function createSandbox(dir: string): Promise<void> {
    // Native fs APIs handle Windows paths better than shelling out
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
}

export async function cleanupSandbox(dir: string): Promise<void> {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
