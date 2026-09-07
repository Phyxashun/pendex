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

const SKIP = new Set([
    "node_modules", ".git", "dist", "build", "coverage",
    ".turbo", ".next", "out", ".cache", ".output",
]);

export async function bumpVersion(
    options: { version?: string; reset?: boolean } = {},
) {
    const spec = parseSpec(options);
    const files: string[] = [];
    await walk(projectRoot, files);
    files.sort();

    const sources = await Promise.all(files.map(f => readFile(f, "utf8")));

    const changes = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const source = sources[i];
        const pkg = JSON.parse(source) as { name?: string; version?: string };
        const from = pkg.version ?? "0.0.0";
        const to = nextVersion(from, spec);
        if (from !== to) {
            await writeFile(file, applyVersion(source, to), "utf8");
        }
        changes.push({
            file: relative(projectRoot, file),
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
    const stripped = mask.replace(/^v/, "");
    if (/^\d+\.\d+\.\d+/.test(stripped)) {
        return { kind: "set" as const, value: stripped };
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

function applyVersion(source: string, next: string): string {
    return source.replace(
        /("version"\s*:\s*")([^"]*)(")/,
        `$1${next}$3`,
    );
}

async function walk(dir: string, found: string[]) {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP.has(entry.name) || entry.name.startsWith(".")) return;
            await walk(path, found);
        } else if (entry.isFile() && entry.name === "package.json") {
            found.push(path);
        }
    }));
}

/**
 * MAIN ENTRY POINT
 */
if (import.meta.main) {
    try {
        const version = Bun.argv[2] ? Bun.argv[2] : "0.0.0";
        const reset = Bun.argv[3] ? true : false;

        await bumpVersion({
            version,
            reset
        });
    } catch (err: unknown) {
        console.error(err);
        process.exit(1);
    }
}
