// oxlint-disable typescript/no-explicit-any
//
import * as p from '@clack/prompts';
import { Colors } from '@pendex/color';
import type { Config, ThemeConfig } from '@pendex/core';
import type { ThemeName } from '@pendex/theme';
import { existsSync } from 'fs';
import path from 'path';
import { ConfigStore } from './ConfigStore';

// ==========================================
// VALUE VALIDATION CORE SYSTEM
// ==========================================
// Explicitly match your CompileOutputType enum/type values
type CompileOutputType = 'txt' | 'pdf' | 'md';

interface ValidationRule<T> {
    validate: (val: T) => string | boolean;
    hint: string;
}

// A mapped type ensuring every key in Config has a strong typed ValidationRule
type ConfigValidationRules = {
    [K in keyof Config]: ValidationRule<Config[K]>;
} & {
    // This explicitly permits string indexing without dropping strict type matching
    [key: string]: ValidationRule<any> | undefined;
};

const currentFormState = {
    themeName: '',
};

// Extensible validation matrix mapped by exact key or dot-notation path patterns
const VALIDATION_RULES: ConfigValidationRules = {
    theme: {
        validate: (val: ThemeConfig) => {
            const validTypes: ThemeName[] = [
                'default',
                'pendex',
                'dracula',
                'monokaipro',
                'onedark',
                'tokyonight',
            ];

            // `Array.includes` returns a boolean. Check if it's false.
            if (!validTypes.includes(val.name)) {
                return `Theme name must be a valid name: ${validTypes.join(', ')}.`;
            }

            // `val.name` is safe to use because the previous check passed
            const expectedPath = path.join(val.path, `${val.name}.toml`);

            // Check if the file does NOT exist, then return the error string
            if (!existsSync(expectedPath)) {
                return `Theme path must contain the theme configuration file: ${val.name}.toml`;
            }

            // Return true if all checks pass successfully
            return true;
        },
        hint: 'Must be a valid ThemeConfig object containing the theme name and the path to the theme configuration file.',
    },

    'theme.name': {
        validate: (val: string) => {
            const validTypes: ThemeName[] = [
                'default',
                'pendex',
                'dracula',
                'monokaipro',
                'onedark',
                'tokyonight',
            ];

            if (validTypes.includes(val as ThemeName)) {
                // Save the valid name so the next prompt can see it
                currentFormState.themeName = val;
                return true;
            }
            return `Theme name must be a valid name: ${validTypes.join(', ')}.`;
        },
        hint: 'Must be a valid theme name.',
    },

    'theme.path': {
        validate: (val: string) => {
            // Pull the theme name saved from the previous prompt step
            const themeName = currentFormState.themeName ?? '';
            const expectedPath = path.join(val, `${themeName}.toml`);

            if (!existsSync(expectedPath)) {
                return `Theme path must contain the theme configuration file: ${themeName}.toml`;
            }

            return true;
        },
        hint: 'Must be a valid path to a theme configuration file.',
    },

    http: {
        validate: val =>
            typeof val === 'boolean' || 'HTTP setting must be true or false.',
        hint: 'Boolean true/false flag.',
    },

    outputType: {
        validate: val => {
            const validTypes: CompileOutputType[] = ['txt', 'pdf', 'md'];
            return (
                validTypes.includes(val) ||
                `Invalid output type. Allowed: ${validTypes.join(', ')}`
            );
        },
        hint: 'Must match a valid compile output strategy.',
    },

    outputDir: {
        validate: val => {
            if (typeof val !== 'string' || val.trim() === '')
                return 'Output directory path is required.';
            if (val.includes(' '))
                return 'Directory path cannot contain spaces.';
            return true;
        },
        hint: 'System path string for output builds.',
    },

    rebuiltDir: {
        validate: val => {
            if (typeof val !== 'string' || val.trim() === '')
                return 'Rebuilt directory path is required.';
            return true;
        },
        hint: 'System path string for split builds.',
    },

    exclude: {
        validate: val => {
            if (!Array.isArray(val))
                return 'Exclude targets must be an array of glob strings.';
            const nonStrings = val.some(item => typeof item !== 'string');
            if (nonStrings)
                return 'All exclude globs must be valid text strings.';
            return true;
        },
        hint: 'Array of file/folder glob match strings.',
    },

    jobs: {
        validate: val => {
            if (!Array.isArray(val))
                return 'Jobs parameter must be a structural array.';
            if (val.length === 0)
                return 'At least one compile job must be defined.';

            // Perform inline structural checks on the job schema arrays
            for (let i = 0; i < val.length; i++) {
                const job = val[i];
                if (job) {
                    if (!job.filename || typeof job.filename !== 'string') {
                        return `Job [index ${i}] is missing a valid "filename" string target.`;
                    }
                }
            }
            return true;
        },
        hint: 'Active compile workspace pipeline Job array.',
    },
};

export class ConfigInitView {
    private configStore!: ConfigStore;

    public async start(): Promise<void> {
        console.clear();
        p.intro('🛠️ Advanced SQLite Configuration Manager CLI');

        const dbName = await p.text({
            message: 'Enter the SQLite database file name to load:',
            placeholder: 'app_config',
            initialValue: 'app_config',
            validate: v => {
                if (!v) return undefined;
                return !v.trim() ? 'Filename cannot be blank.' : undefined;
            },
        });

        if (p.isCancel(dbName)) return this.exitWizard();

        try {
            // Initialize the singleton passing an explicit prompt gate callback context
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

            p.log.info('📂 Connected to database session successfully.');

            // Hydrate state from the loaded database config if theme.name exists
            const existingThemeName = this.configStore.get('theme.name');
            if (existingThemeName) {
                currentFormState.themeName = String(existingThemeName);
                console.log(
                    `${Colors.yellow('THEME NAME:')} ${currentFormState.themeName}`,
                );
            }

            // Fall back into the main operation selection menu loop framework
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
                        value: 'view',
                        label: '1.  View Record(s)',
                    },
                    {
                        value: 'add',
                        label: '2.  Add/Edit a Record',
                    },
                    {
                        value: 'delete',
                        label: '3.  Delete a Record',
                    },
                    {
                        value: 'import_toml',
                        label: '4.  Import TOML File',
                    },
                    {
                        value: 'export_toml',
                        label: '5.  Export TOML File',
                    },
                    {
                        value: 'exit',
                        label: `${Colors.red('❌. EXIT')}`,
                    },
                ],
            });

            if (p.isCancel(selection) || selection === 'exit') {
                this.exitWizard();
                break;
            }

            if (selection === 'view') await this.handleViewingMode();
            if (selection === 'add') await this.handleAddPair();
            if (selection === 'delete') await this.handleDeleteRecord();
            if (selection === 'import_toml') await this.handleTomlImport();
            if (selection === 'export_toml') await this.handleTomlExport();
        }
    }

    // 1. INTERACTIVE VIEWING MODE WITH LIVE KEY SEARCH FILTER
    private async handleViewingMode(): Promise<void> {
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

        // Format records into a clean, bulleted string list
        const recordLines = filtered
            .map(record => {
                const rootKey = Colors.greenBright(`${record.key}`);
                const rootValue = this.formatValue(record.value, 0);
                return `${rootKey}: ${rootValue}`;
            })
            .join('\n');

        // Render it inside a styled Clack note box
        p.note(
            recordLines,
            `MATCHING CONFIGURATION RECORDS (${filtered.length} items)`,
        );
    }

    /*     private async handleViewingMode(): Promise<void> {
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

                console.log('\n┌' + '─'.repeat(78) + '┐');
                console.log(
                    `│ ${`MATCHING CONFIGURATION RECORDS (${filtered.length} items)`.padEnd(76)} │`,
                );
                console.log('├' + '─'.repeat(78) + '┤');

                for (const record of filtered) {
                    const line = `• [${record.key}]: ${record.value}`;
                    console.log(`│ ${line.substring(0, 74).padEnd(76)} │`);
                }
                console.log('└' + '─'.repeat(78) + '┘\n');
            }
    */

    // 2. ADD RECORD WITH INTERACTIVE VALIDATION PIPELINE
    private async handleAddPair(): Promise<void> {
        const key = await p.text({
            message: 'Enter Configuration Key identifier:',
            validate: (v: string | undefined) => {
                const value = v ?? '';
                if (!value) return;
                return !value.trim()
                    ? 'Key cannot be empty.'
                    : /\s/.test(value)
                      ? 'No spaces allowed.'
                      : undefined;
            },
        });
        if (p.isCancel(key)) return;

        const formattedKey = Colors.yellow(`[${key}]`);

        // Look for matching strict validation pattern configurations
        const rule = VALIDATION_RULES[key];
        if (rule) {
            p.log.info(
                `💡 Validation Rule Detected for ${formattedKey} ➔  ${Colors.cyan(rule.hint)}`,
            );
        }

        const val = await p.text({
            message: `Enter Value string for key ${formattedKey}:`,
            validate: input => {
                if (rule) {
                    const parsed = this.inferType(input!);
                    const validationResult = rule.validate(parsed);
                    if (validationResult !== true) {
                        return typeof validationResult === 'string'
                            ? validationResult
                            : `${Colors.red('Value failed explicit validation criteria constraints.')}`;
                    }
                }
                return undefined;
            },
        });
        if (p.isCancel(val)) return;

        this.configStore.set(key, this.inferType(val));
        p.log.success(
            `Saved setting ➔  ${formattedKey} ${Colors.green('successfully passed syntax screening validation.')}`,
        );
    }

    // 3. INTERACTIVE RECURSIVE SELECTION WITH SEARCH FILTER PRE-STEP
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

    // 4. TOML IMPORT INTEGRATING THE BATCH VALIDATION HOOKS
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

    // 5. TOML EXPORT
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

    // ❌. EXIT APP
    private exitWizard(): void {
        if (this.configStore) this.configStore.close();
        p.outro(
            '👋  Database connections unmounted safely. Environment closed.',
        );
        process.exit(0);
    }

    /**
     * PRIVATE UTILITY METHODS
     */

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

    // Identifies an array item based on Job or standard configuration schemas.
    private getArrayItemName(item: Record<string, any>): string | null {
        const identifyingKeys = ['filename', 'category', 'name', 'id', 'title'];

        for (const key of identifyingKeys) {
            if (key in item && item[key] !== undefined && item[key] !== null) {
                return String(item[key]);
            }
        }

        return null;
    }

    // Recursively formats unknown configuration data types into a structured terminal string.
    private formatValue(value: any, depth: number = 0): string {
        const space = ' ';
        const tabWidth = 4;
        const tab = space.repeat(tabWidth);
        const indent = tab.repeat(depth);
        const nextIndent = tab.repeat(depth + 1);

        if (value === null) {
            return Colors.gray('null');
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';

            const items = value.map((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    const name = this.getArrayItemName(item);
                    const nameLabel =
                        name ?? ('filename' in item ? 'Job' : 'Item');
                    const label = `"${nameLabel}"[${index}]`;

                    const itemHeader = Colors.magenta(`# ${label}:`);
                    const formattedObject = this.formatValue(item, depth + 1);
                    return `${indent}${itemHeader}\n${formattedObject}`;
                }

                return `${nextIndent}${this.formatValue(item, depth + 1)}`;
            });

            return `[\n${items.join('\n')}\n${indent}]`;
        }

        switch (typeof value) {
            case 'string': {
                const inferred = this.inferType(value);

                // Guard: If inferType returned a different type or structure, evaluate it recursively
                if (inferred !== value) {
                    return this.formatValue(inferred, depth);
                }

                // Otherwise, treat it as a standard primitive string leaf node
                return Colors.cyan(value);
            }

            case 'number':
                return Colors.yellow(value.toString());

            case 'boolean':
                return Colors.magenta(value.toString());

            case 'object': {
                const keys = Object.keys(value);
                if (keys.length === 0) return '{}';

                const lines = keys.map(k => {
                    const formattedKey = Colors.greenBright(`${k}`);
                    const formattedValue = this.formatValue(
                        value[k],
                        depth + 1,
                    );
                    return `${nextIndent}${formattedKey}: ${formattedValue}`;
                });

                return `{\n${lines.join('\n')}\n${indent}}`;
            }

            default:
                return String(value);
        }
    }
}

if (import.meta.main) {
    new ConfigInitView().start().catch(console.error);
}
