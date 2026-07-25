
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cancel, confirm, intro, isCancel, log, note, outro, select, spinner } from '@clack/prompts';
import path from 'path';
import { Colors } from '@pendex/color';

/**
 * CONSTANTS
 */



/**
 * TYPES
 */

interface Theme {
    primary(text: string): string;
    success(text: string): string;
    error(text: string): string;
    muted(text: string): string;
}

const DarkTheme: Theme = {
    primary: (txt) => Colors.bgCyan(Colors.black(` ${txt} `)),
    success: (txt) => Colors.green(txt),
    error: (txt) => Colors.red(txt),
    muted: (txt) => Colors.dim(txt),
};

interface HeaderCommentsDeps {
    theme: Theme,
    config: {
        outputDir: string;
        exclude: string[];
    };
}

interface HeaderUpdate {
    modified: boolean;
    reason?: string;
}

interface ScanSummary {
    total: number;
    processed: number;
    skipped: number;
    failed: number;
}

type HeaderAction = 'inject' | 'strip' | 'exit';

/**
 * MAIN CLASSES
 */

export abstract class Command {
    abstract readonly key: string;
    abstract readonly label: string;
    abstract readonly hint: string;
    constructor(_deps: unknown) { }
    abstract execute(): Promise<void>;
}

export class HeaderComments extends Command {
    readonly key = 'headercomments';
    readonly label = 'HeaderComments Manager';
    readonly hint = 'Inject or strip contextual path comment descriptors';

    private deps: HeaderCommentsDeps;

    private readonly BASE_DIR = process.cwd();
    private readonly COMMENT = '//';
    private readonly HEADER_COMMENT = `${this.COMMENT} FILE-PATH:`;
    private readonly SHEBANG_REGEX = /^#!.*/;
    private readonly FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'json', 'jsonc', 'toml', 'yaml', 'yml', 'md'];

    private readonly BULLET = {
        arrow: '->',
        arrowHead: '➤',
        circle: {
            green: '🟢',
            white: '⚪',
            red: '🔴',
            purple: '🟣',
        },
        cancel: '✖️',
        complete: '✅',
        success: '☑️ ',
        error: '☠️',
        exit: '❌',
        comment: '💬',
    } as const;

    constructor(deps: HeaderCommentsDeps) {
        super(deps);
        this.deps = deps;
    }

    private toUnixPath(p: string): string {
        return p.replace(/\\/g, '/');
    }

    private isIgnorePath(filePath: string, compiledExcludes: any[]): boolean {
        const unixPath = this.toUnixPath(filePath);
        return unixPath.startsWith('node_modules/') ||
            unixPath.startsWith('.git/') ||
            unixPath.startsWith(`${this.deps.config.outputDir}/`) ||
            compiledExcludes.some(glob => glob.match(filePath));
    }

    public async enforceHeaderComments(absolutePath: string): Promise<HeaderUpdate> {
        const file = Bun.file(absolutePath);
        const contents = await file.text();

        if (contents.includes(this.HEADER_COMMENT)) {
            return { modified: false, reason: 'Header comment already present.' };
        }

        const relativePath = path.relative(this.BASE_DIR, absolutePath);
        const unixRelativePath = this.toUnixPath(relativePath);
        const targetHeader = `${this.HEADER_COMMENT} ${unixRelativePath}\n`;

        const firstNewlineIdx = contents.indexOf('\n');
        const firstLine = firstNewlineIdx === -1 ? contents : contents.slice(0, firstNewlineIdx).replace('\r', '');

        let updatedContent = '';
        if (this.SHEBANG_REGEX.test(firstLine)) {
            const remainingContent = firstNewlineIdx === -1 ? '' : contents.slice(firstNewlineIdx + 1);
            const separator = remainingContent.trim().length > 0 ? '\n' : '';
            updatedContent = `${firstLine}\n${targetHeader}${separator}${remainingContent}`;
        } else {
            const separator = contents.length > 0 ? '\n' : '';
            updatedContent = `${targetHeader}${separator}${contents}`;
        }

        await Bun.write(absolutePath, updatedContent);
        return { modified: true };
    }

    public async removeHeaderComments(absolutePath: string): Promise<HeaderUpdate> {
        const file = Bun.file(absolutePath);
        const contents = await file.text();

        if (!contents.includes(this.HEADER_COMMENT)) {
            return { modified: false, reason: 'Header comment not present.' };
        }

        const firstNewlineIdx = contents.indexOf('\n');
        const firstLine = firstNewlineIdx === -1 ? contents : contents.slice(0, firstNewlineIdx).replace('\r', '');

        let updatedContent = '';

        if (this.SHEBANG_REGEX.test(firstLine)) {
            const remainingContent = firstNewlineIdx === -1 ? '' : contents.slice(firstNewlineIdx + 1);
            const nextNewlineIdx = remainingContent.indexOf('\n');
            const secondLine = nextNewlineIdx === -1 ? remainingContent : remainingContent.slice(0, nextNewlineIdx);

            if (secondLine.includes(this.HEADER_COMMENT)) {
                updatedContent = `${firstLine}\n${nextNewlineIdx === -1 ? '' : remainingContent.slice(nextNewlineIdx + 1)}`;
            } else {
                updatedContent = `${firstLine}\n${remainingContent.replace(this.HEADER_COMMENT, '')}`;
            }
        } else {
            if (firstLine.includes(this.HEADER_COMMENT)) {
                updatedContent = firstNewlineIdx === -1 ? '' : contents.slice(firstNewlineIdx + 1);
            } else {
                updatedContent = contents.replace(new RegExp(`.*${RegExp.escape(this.HEADER_COMMENT)}.*\\n?`, 'g'), '');
            }
        }

        await Bun.write(absolutePath, updatedContent.trimStart());
        return { modified: true };
    }

    private async processBatch(action: 'inject' | 'strip'): Promise<ScanSummary> {
        const summary: ScanSummary = { total: 0, processed: 0, skipped: 0, failed: 0 };
        const extensionsList = this.FILE_EXTENSIONS.join(',');
        const glob = new Bun.Glob(`**/*.{${extensionsList}}`);

        const excludeGlobs = this.deps.config.exclude.map(ex => new Bun.Glob(ex));
        const fileBuffer: string[] = [];

        for await (const relativePath of glob.scan({ cwd: this.BASE_DIR })) {
            fileBuffer.push(relativePath);
        }

        summary.total = fileBuffer.length;

        await Promise.all(fileBuffer.map(async (relativePath) => {
            if (this.isIgnorePath(relativePath, excludeGlobs)) {
                summary.skipped++;
                return;
            }

            const absolutePath = path.join(this.BASE_DIR, relativePath);
            try {
                const res = action === 'inject'
                    ? await this.enforceHeaderComments(absolutePath)
                    : await this.removeHeaderComments(absolutePath);

                if (res.modified) summary.processed++;
                else summary.skipped++;
            } catch (error) {
                summary.failed++;
                log.error(`${this.BULLET.error} Exception encountered for ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }));

        return summary;
    }

    async execute(): Promise<void> {
        console.clear();
        intro(`${Colors.bgYellow(Colors.black(' HEADERCOMMENTS '))} ${Colors.yellow(Colors.dim('Scans and Synchronizes Headers'))}`);

        const operation = await select<HeaderAction>({
            message: Colors.cyan('Pick an option:'),
            options: [
                { value: 'inject', label: 'Inject HeaderComments', hint: 'Append contextual tags' },
                { value: 'strip', label: 'Strip HeaderComments', hint: 'Scrub existing comment tags' },
                { value: 'exit', label: 'Exit menu context' }
            ]
        });

        if (isCancel(operation) || operation === 'exit') {
            cancel(Colors.yellow(`${this.BULLET.success} Operation aborted. Project files left unmodified.`));
            return;
        }

        const shouldProceed = await confirm({
            message: `Verify and run structural updates across project root directory?\n${this.BULLET.arrowHead} (${Colors.cyan(this.BASE_DIR)})`,
            initialValue: operation === 'inject',
        });

        if (isCancel(shouldProceed) || !shouldProceed) {
            cancel(Colors.yellow(`${this.BULLET.success} Operation aborted. Project files left unmodified.`));
            return;
        }

        const s = spinner();
        s.start(Colors.cyan('Evaluating active project workspaces and indexing targets...'));

        try {
            const metrics = await this.processBatch(operation);
            s.stop(Colors.green('Header resolution sweep finished processing successfully!!!\n'));

            const labelText = this.BULLET.circle.green + (operation === 'inject' ? ' Processed:' : ' Stripped:');
            const hintText = this.BULLET.arrowHead + (operation === 'inject' ? ' Appended or confirmed targets' : ' Erased comment headers');

            const reportBody = [
                `${Colors.bold(labelText)} ${Colors.green(metrics.processed.toString().padStart(6))}   ${Colors.dim(hintText)}`,
                `${Colors.bold(this.BULLET.circle.white + ' Skipped: ')} ${Colors.dim(metrics.skipped.toString().padStart(8))}   ${Colors.dim(this.BULLET.arrowHead + ' Excluded folders & skips')}`,
                `${Colors.bold(this.BULLET.circle.red + ' Failed:  ')} ${Colors.red(metrics.failed.toString().padStart(9))}   ${Colors.dim(this.BULLET.arrowHead + ' Hard drive read/write blocks')}`,
                Colors.dim('----------------------------------------------------'),
                `${Colors.bold(this.BULLET.circle.purple + ' TOTAL:   ')} ${Colors.magenta(metrics.total.toString().padStart(10))}   ${Colors.dim(this.BULLET.arrowHead + ' Aggregated project file count')}`
            ].join('\n');

            note(reportBody, Colors.cyan(`Execution Metrics Summary Window`));
            outro(this.deps.theme.success('Project workspace synchronization matches verified state parameters.'));
        } catch (error: unknown) {
            s.stop(this.deps.theme.error('A critical fatal failure crashed processing workflows.'));
            log.error(error instanceof Error ? error.message : String(error));
        }
    }
}

/**
 * STANDALONE EXECUTION ENGINE ENTRY POINT
 */

// c8 ignore start
if (import.meta.main) {
    const app = new HeaderComments({
        theme: DarkTheme,
        config: {
            outputDir: 'ALL',
            exclude: [
                '**/*.{toml,json,jsonc}',
                '.vscode/**',
                'ALL/**',
                'ALL_REBUILT/**',
                'logs/**',
                'node_modules/**',
                'bun.lock',
                'package.json',
                'README.md',
                'tsconfig.json',
                'dist/**',
                'coverage/**'
            ]
        }
    });

    app.execute().catch((err) => {
        log.error(`Fatal crash: ${err?.message || err}`);
        process.exit(1);
    });
}
// c8 ignore stop
