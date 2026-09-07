// oxlint-disable typescript/no-explicit-any
//
import { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import path, { join } from 'node:path';
export const configFile = 'packages/core/config/config.toml';
function findProjectRoot(startDir: string): string {
    let currentDir = startDir;
    while (currentDir !== path.dirname(currentDir)) {
        if (
            existsSync(join(currentDir, 'package.json')) ||
            existsSync(join(currentDir, 'bun.lockb'))
        ) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    return startDir;
}

export class ConfigStore {
    private static instance: ConfigStore | null = null;
    private db!: Database;

    private constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.initSchema();
    }

    /**
     * Safe entry-point initializer that handles dev prompting requirements
     * and production crash safety gates before boot.
     */
    public static async initialize(
        dbFilename: string,
        onPromptCreation: () => Promise<boolean>,
    ): Promise<ConfigStore> {
        if (ConfigStore.instance) return ConfigStore.instance;

        const root = findProjectRoot(import.meta.dirname);
        const resolvedPath = join(
            root,
            dbFilename.endsWith('.sqlite')
                ? dbFilename
                : `${dbFilename}.sqlite`,
        );
        const fileExists = existsSync(resolvedPath);
        const isProduction = process.env.NODE_ENV === 'production';

        if (!fileExists) {
            if (isProduction) {
                // Strict production constraint: Crash instead of auto-generating an empty environment database
                throw new Error(
                    `[CRITICAL] Production Database not found at path: ${resolvedPath}. Database must pre-exist in production layouts.`,
                );
            }

            // Development interactive confirmation hook behavior
            const shouldCreate = await onPromptCreation();
            if (!shouldCreate) {
                throw new Error(
                    'Database initialization aborted by developer.',
                );
            }
        }

        // If it exists, it automatically appends to it natively.
        ConfigStore.instance = new ConfigStore(resolvedPath);
        return ConfigStore.instance;
    }

    public static getInstance(): ConfigStore {
        if (!ConfigStore.instance) {
            throw new Error(
                'ConfigStore database must be explicitly initialized first via ConfigStore.initialize(...)',
            );
        }
        return ConfigStore.instance;
    }

    private initSchema() {
        this.db.run(`
      CREATE TABLE IF NOT EXISTS application_config (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }

    public set(key: string, value: any): void {
        const serializedValue =
            typeof value === 'object' ? JSON.stringify(value) : String(value);
        this.db
            .prepare(`
      INSERT INTO application_config (key, value, updated_at)
      VALUES ($key, $value, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
            .run({ $key: key, $value: serializedValue });
    }

    public get<T = any>(key: string): T | undefined {
        const result = this.db
            .prepare('SELECT value FROM application_config WHERE key = $key')
            .get({ $key: key }) as { value: string } | null;
        if (!result) return undefined;
        try {
            return JSON.parse(result.value) as T;
        } catch {
            return result.value as any;
        }
    }

    public getAll(): Array<{ key: string; value: string; updated_at: string }> {
        return this.db
            .prepare(
                'SELECT key, value, updated_at FROM application_config ORDER BY key ASC',
            )
            .all() as any;
    }

    public delete(key: string): void {
        this.db
            .prepare('DELETE FROM application_config WHERE key = $key')
            .run({ $key: key });
    }

    public close(): void {
        this.db.close();
        ConfigStore.instance = null;
    }
}
