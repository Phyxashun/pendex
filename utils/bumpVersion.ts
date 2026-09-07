import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { dirname } from 'path';

function findProjectRoot(startDir: string): string {
    let currentDir = startDir;

    while (currentDir !== dirname(currentDir)) {
        // Look for common project root indicators
        if (
            existsSync(join(currentDir, "package.json")) ||
            existsSync(join(currentDir, "bun.lockb")) ||
            existsSync(join(currentDir, "tsconfig.json")) ||
            existsSync(join(currentDir, ".git"))
        ) {
            return currentDir;
        }
        currentDir = dirname(currentDir);
    }

    throw new Error("Could not dynamically determine the project root directory.");
}

// Automatically starts looking from the directory of this current file
const projectRoot = findProjectRoot(import.meta.dirname);
const outputDir = (p: string) => join(projectRoot, p);

const SKIP = new Set([
    "node_modules", ".git", "dist", "build", "coverage",
    ".turbo", ".next", "out", ".cache", ".output",
]);

export async function bumpVersion(
    rootDir: string,
    options: { version?: string; reset?: boolean } = {},
) {
    const spec = parseSpec(options);
    const files: string[] = [];
    await walk(rootDir, files);
    files.sort();

    const changes = [];
    for (const file of files) {
        const source = await readFile(file, "utf8");
        const pkg = JSON.parse(source) as { name?: string; version?: string };
        const from = pkg.version ?? "0.0.0";
        const to = nextVersion(from, spec);
        if (from !== to) {
            await writeFile(file, applyVersion(source, to), "utf8");
        }
        changes.push({
            file: relative(rootDir, file) || "package.json",
            from,
            to,
        });
    }
    return changes;
}

function parseSpec(options: { version?: string; reset?: boolean }) {
    const version = options.version?.trim();
    if (options.reset && version) {
        throw new Error("Pass either reset or version, not both.");
    }
    if (options.reset) return { kind: "reset" as const };
    if (!version) {
        throw new Error(
            'Provide { version: "#.#.#" | "X.X.+" | "X.+.X" | "+.X.X" } or { reset: true }.',
        );
    }
    const mask = version.replace(/,/g, ".").replace(/\s+/g, "").toUpperCase();
    if (mask === "X.X.+") return { kind: "patch" as const };
    if (mask === "X.+.X") return { kind: "minor" as const };
    if (mask === "+.X.X") return { kind: "major" as const };
    if (/^\d+\.\d+\.\d+/.test(version.replace(/^v/, ""))) {
        return { kind: "set" as const, value: version.replace(/^v/, "") };
    }
    throw new Error(`Unknown version spec "${version}"`);
}

function nextVersion(
    current: string,
    spec: { kind: "reset" | "set" | "major" | "minor" | "patch"; value?: string },
) {
    if (spec.kind === "reset") return "0.0.0";
    if (spec.kind === "set") return spec.value!;
    const m = current.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
    if (!m) throw new Error(`Cannot parse version "${current}"`);
    const major = Number(m[1]), minor = Number(m[2]), patch = Number(m[3]);
    if (spec.kind === "patch") return `${major}.${minor}.${patch + 1}`;
    if (spec.kind === "minor") return `${major}.${minor + 1}.${patch}`;
    return `${major + 1}.${minor}.${patch}`;
}

function applyVersion(source: string, pkg: Record<string, unknown>, next: string): string {
    const indent = source.match(/\n([ \t]+)"/)?.[1]?.length ?? 2;
    pkg.version = next; // object preserves key insertion order
    return JSON.stringify(pkg, null, indent) + (source.endsWith("\n") ? "\n" : "");
}

async function walk(dir: string, found: string[]) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
            await walk(path, found);
        } else if (entry.isFile() && entry.name === "package.json") {
            found.push(path);
        }
    }
}

/**
 * Extract CLI arguments
 *
 * Bun.argv[0] is the bun binary path
 * Bun.argv[1] is the script path (./packages/db/src/ConfigInitView.ts)
 * Bun.argv[2] is first custom argument
 */
/**
 * MAIN ENTRY POINT
 */
if (import.meta.main) {
    let version = "0.0.0";

    try {
        if (Bun.argv[2]) {
            version = Bun.argv[2];
        }
        const reset = Bun.argv[3] ? true : false;

        const options = {
            version,
            reset
        }
        await bumpVersion(
            outputDir,
            options
        )
    } catch (err: unknown) {
        console.error(err);
        process.exit(1);
    }
}
