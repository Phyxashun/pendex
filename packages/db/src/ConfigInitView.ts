// oxlint-disable typescript/no-explicit-any
//
import * as p from '@clack/prompts';
import { ConfigStore } from './ConfigStore';

// ==========================================
// VALUE VALIDATION CORE SYSTEM
// ==========================================
interface ValidationRule {
    validate: (val: any) => string | boolean;
    hint: string;
}

// Extensible validation matrix mapped by exact key or dot-notation path patterns
const VALIDATION_RULES: Record<string, ValidationRule> = {
    'server.port': {
        validate: val =>
            !isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 65535
                ? true
                : 'Port must be a valid integer between 1 and 65535.',
        hint: 'Expected format: Int (1-65535)',
    },
    'database.url': {
        validate: val =>
            typeof val === 'string' &&
            (val.startsWith('postgresql://') ||
                val.startsWith('mongodb://') ||
                val.startsWith('sqlite://')),
        hint: 'Expected format: Valid database connection string URI',
    },
    'app.environment': {
        validate: val =>
            typeof val === 'string' &&
            ['development', 'staging', 'production'].includes(
                val.toLowerCase(),
            ),
        hint: 'Expected options: development, staging, production',
    },
};

export class ConfigInitView {
    private configStore!: ConfigStore;

    public async start(): Promise<void> {
        console.clear();
        p.intro('🛠️  Advanced SQLite Configuration Manager CLI');

        const dbName = await p.text({
            message: 'Enter the SQLite database file name to load:',
            placeholder: 'app_config',
            initialValue: 'app_config',
            validate: v =>
                !v!.trim() ? 'Filename cannot be blank.' : undefined,
        });
        if (p.isCancel(dbName)) return this.exitWizard();

        try {
            // 1. Initialize the singleton passing an explicit prompt gate callback context
            this.configStore = await ConfigStore.initialize(
                dbName,
                async () => {
                    const confirmCreate = await p.confirm({
                        message: `The database file "${dbName}.sqlite" was not found. Do you want to create a new database configuration file?`,
                        initialValue: true,
                    });

                    if (p.isCancel(confirmCreate)) return false;
                    return confirmCreate;
                },
            );

            p.log.info('📂  Connected to database session successfully.');

            // 2. Fall back into the main operation selection menu loop framework
            await this.menuLoop();
        } catch (err: any) {
            p.log.error(`Initialization Failed: ${err.message}`);
            this.exitWizard();
        }
    }

    private async menuLoop(): Promise<void> {
        while (true) {
            const selection = await p.select({
                message: 'Select an operation action:',
                options: [
                    {
                        value: 'list',
                        label: 'View DB Records',
                    },
                    {
                        value: 'add',
                        label: 'Add or Update a Record',
                    },
                    {
                        value: 'import_toml',
                        label: 'Import TOML File',
                    },
                    {
                        value: 'export_toml',
                        label: 'Export DB to TOML File',
                    },
                    {
                        value: 'delete',
                        label: 'Delete a Record',
                    },
                    { value: 'exit', label: '❌ Close Database and Exit' },
                ],
            });

            if (p.isCancel(selection) || selection === 'exit') {
                this.exitWizard();
                break;
            }

            if (selection === 'list') await this.handleListingMode();
            if (selection === 'add') await this.handleAddPair();
            if (selection === 'import_toml') await this.handleTomlImport();
            if (selection === 'export_toml') await this.handleTomlExport();
            if (selection === 'delete') await this.handleDeleteRecord();
        }
    }

    // 1. ADD RECORD WITH INTERACTIVE VALIDATION PIPELINE
    private async handleAddPair(): Promise<void> {
        const key = await p.text({
            message: 'Enter Configuration Key identifier:',
            validate: (v: string | undefined) =>
                !v!.trim()
                    ? 'Key cannot be empty.'
                    : /\s/.test(v as string)
                      ? 'No spaces allowed.'
                      : undefined,
        });
        if (p.isCancel(key)) return;

        // Look for matching strict validation pattern configurations
        const rule = VALIDATION_RULES[key];
        if (rule) {
            p.log.info(
                `💡 Validation Rule Detected for [${key}] ➔ ${rule.hint}`,
            );
        }

        const val = await p.text({
            message: `Enter Value string for key '${key}':`,
            validate: input => {
                if (rule) {
                    const parsed = this.inferType(input!);
                    const validationResult = rule.validate(parsed);
                    if (validationResult !== true) {
                        return typeof validationResult === 'string'
                            ? validationResult
                            : 'Value failed explicit validation criteria constraints.';
                    }
                }
                return undefined;
            },
        });
        if (p.isCancel(val)) return;

        this.configStore.set(key, this.inferType(val));
        p.log.success(
            `Saved setting ➔ [${key}] successfully passed syntax screening validation.`,
        );
    }

    // 2. INTERACTIVE LISTING MODE WITH LIVE KEY SEARCH FILTER
    private async handleListingMode(): Promise<void> {
        const records = this.configStore.getAll();
        if (records.length === 0) {
            p.log.warn(
                'The database configuration table is currently completely empty.',
            );
            return;
        }

        const filterText = await p.text({
            message:
                'Enter search filter query (Press Enter to view all records):',
            placeholder: "e.g., 'server' or 'db'",
        });
        if (p.isCancel(filterText)) return;

        const query = filterText.trim().toLowerCase();
        const filtered = records.filter(r =>
            r.key.toLowerCase().includes(query),
        );

        if (filtered.length === 0) {
            p.log.warn(
                `No active records found matching search string "${filterText}".`,
            );
            return;
        }

        p.log.info(
            `Matching Configuration Records (${filtered.length} items):`,
        );
        console.table(filtered.map(r => ({ Key: r.key, Value: r.value })));
    }
    // private async handleListingMode(): Promise<void> {
    //     const records = this.configStore.getAll();
    //     if (records.length === 0) {
    //         p.log.warn(
    //             'The database configuration table is currently completely empty.',
    //         );
    //         return;
    //     }

    //     const filterText = await p.text({
    //         message:
    //             'Enter search filter query (Press Enter to view all records):',
    //         placeholder: "e.g., 'server' or 'db'",
    //     });
    //     if (p.isCancel(filterText)) return;

    //     const query = filterText.trim().toLowerCase();
    //     const filtered = records.filter(r =>
    //         r.key.toLowerCase().includes(query),
    //     );

    //     if (filtered.length === 0) {
    //         p.log.warn(
    //             `No active records found matching search string "${filterText}".`,
    //         );
    //         return;
    //     }

    //     console.log('\n┌' + '─'.repeat(78) + '┐');
    //     console.log(
    //         `│ ${`MATCHING CONFIGURATION RECORDS (${filtered.length} items)`.padEnd(76)} │`,
    //     );
    //     console.log('├' + '─'.repeat(78) + '┤');

    //     for (const record of filtered) {
    //         const line = `• [${record.key}]: ${record.value}`;
    //         console.log(`│ ${line.substring(0, 74).padEnd(76)} │`);
    //     }
    //     console.log('└' + '─'.repeat(78) + '┘\n');
    // }

    // 3. TOML IMPORT INTEGRATING THE BATCH VALIDATION HOOKS
    private async handleTomlImport(): Promise<void> {
        const tomlPath = await p.text({
            message: 'Enter relative path to your .toml file source:',
            placeholder: './config.toml',
            initialValue: './config.toml',
        });
        if (p.isCancel(tomlPath)) return;

        try {
            const fileRaw = await Bun.file(tomlPath).text();
            const parsedToml = Bun.TOML.parse(fileRaw);

            const flattenedRecords: Record<string, any> = {};
            this.flattenObject(parsedToml, '', flattenedRecords);

            let count = 0;
            let rejectedCount = 0;

            for (const [key, val] of Object.entries(flattenedRecords)) {
                const rule = VALIDATION_RULES[key];
                if (rule && rule.validate(val) !== true) {
                    p.log.error(
                        `⚠️  TOML Item [${key}] rejected during parsing: ${rule.hint}`,
                    );
                    rejectedCount++;
                    continue;
                }

                this.configStore.set(key, val);
                count++;
            }

            p.log.success(
                `Import finished! Migrated ${count} keys. (Rejected ${rejectedCount} invalid property bindings)`,
            );
        } catch (err: any) {
            p.log.error(`Conversion processing failed: ${err.message}`);
        }
    }

    private async handleTomlExport(): Promise<void> {
        const records = this.configStore.getAll();
        if (records.length === 0) {
            p.log.warn('The database is currently empty. Nothing to export.');
            return;
        }

        const exportPath = await p.text({
            message:
                'Enter target path where you wish to save the exported TOML file:',
            placeholder: './exported_config.toml',
            initialValue: './exported_config.toml',
        });
        if (p.isCancel(exportPath)) return;

        try {
            const nestedObject = {};
            for (const record of records) {
                const typedValue = this.inferType(record.value);
                this.unflattenObject(record.key, typedValue, nestedObject);
            }
            const tomlOutput = Bun.TOML.stringify(nestedObject) as string;
            await Bun.write(exportPath, tomlOutput);
            p.log.success(
                `Export completed! Nested TOML structure written to: ${exportPath}`,
            );
        } catch (err: any) {
            p.log.error(`Export pipeline failed: ${err.message}`);
        }
    }

    // 4. INTERACTIVE RECURSIVE SELECTION WITH SEARCH FILTER PRE-STEP
    private async handleDeleteRecord(): Promise<void> {
        const records = this.configStore.getAll();
        if (records.length === 0) {
            p.log.warn('No keys available to delete.');
            return;
        }

        const filterText = await p.text({
            message:
                'Filter target delete options list by key name (Or Enter for all options):',
            placeholder: "e.g., 'port'",
        });
        if (p.isCancel(filterText)) return;

        const query = filterText.trim().toLowerCase();
        const filtered = records.filter(r =>
            r.key.toLowerCase().includes(query),
        );

        if (filtered.length === 0) {
            p.log.warn(
                `No configuration items match filtering keyword "${filterText}".`,
            );
            return;
        }

        const options = filtered.map(r => ({
            value: r.key,
            label: `🗑️  ${r.key} (Current value: ${r.value.length > 30 ? r.value.substring(0, 27) + '...' : r.value})`,
        }));

        const targetKey = await p.select({
            message:
                'Select the configuration key you wish to permanently drop:',
            options: options,
        });

        if (p.isCancel(targetKey)) return;

        const confirmDelete = await p.confirm({
            message: `Are you absolutely sure you want to drop the key [${targetKey}]?`,
            initialValue: false,
        });

        if (p.isCancel(confirmDelete) || !confirmDelete) {
            p.log.info('Deletion canceled safely.');
            return;
        }

        this.configStore.delete(targetKey);
        p.log.success(
            `Dropped key [${targetKey}] successfully from database instances.`,
        );
    }

    private flattenObject(
        obj: any,
        prefix: string,
        result: Record<string, any>,
    ): void {
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.flattenObject(value, newKey, result);
            } else {
                result[newKey] = value;
            }
        }
    }

    private unflattenObject(keyPath: string, value: any, targetObj: any): void {
        const parts = keyPath.split('.');
        let current = targetObj;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i] as string;
            if (i === parts.length - 1) {
                current[part] = value;
            } else {
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }
        }
    }

    private inferType<T = unknown>(input: string): T {
        const t = input.trim();
        const lower = t.toLowerCase();

        if (lower === 'true') return true as T;
        if (lower === 'false') return false as T;
        if (t !== '' && !isNaN(Number(t))) return Number(t) as T;

        if (
            (t.startsWith('[') && t.endsWith(']')) ||
            (t.startsWith('{') && t.endsWith('}'))
        ) {
            try {
                return JSON.parse(t) as T;
            } catch {
                return t as T;
            }
        }

        return t as T;
    }

    private exitWizard(): void {
        if (this.configStore) this.configStore.close();
        p.outro(
            '👋  Database connections unmounted safely. Environment closed.',
        );
        process.exit(0);
    }
}

if (import.meta.main) {
    new ConfigInitView().start().catch(console.error);
}
