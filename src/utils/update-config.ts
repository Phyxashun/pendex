/**
 * @module update-config
 *
 * Standalone dev utility: scans the current project for file
 * extensions in use, buckets them into Pendex's standard job
 * categories, and writes a fresh `src/config/jobs.toml`. Meant to be
 * run once against a new project to bootstrap a starting config, not
 * as part of the compile/split pipeline.
 */

import { Glob } from 'bun';
import { extname } from 'path';

/** Paths this tool reads from and writes to. */
const Constants = {
    GITIGNORE_PATH: '.gitignore',
    OUT_PATH: 'src/config/jobs.toml'
};

/** Extension/pattern lists used to bucket discovered files into job categories. */
const CATEGORIES = {
    SOURCE_FILES: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.vue', '.svelte', '.astro', '.py', '.pyw', '.sh', '.bash', '.ps1', '.c', '.h', '.cpp', '.hpp', '.cc', '.hh', '.rs', '.zig', '.java', '.kt', '.kts', '.scala', '.groovy', '.cs', '.fs', '.vb', '.swift', '.m', '.mm', '.dart', '.go', '.rb', '.rbw', '.php', '.hs', '.ex', '.exs', '.erl', '.clj', '.sql'],
    WEB_FILES: ['.html', '.htm', '.xhtml', '.xht', '.mhtml', '.vue', '.svelte', '.astro', '.riot', '.jsx', '.tsx', '.ejs', '.pug', '.jade', '.handlebars', '.hbs', '.mustache', '.twig', '.nunjucks', '.njk', '.php', '.phtml', '.jsp', '.jspx', '.asp', '.aspx', '.cshtml', '.vbhtml', '.j2', '.jinja', '.jinja2', '.erb', '.webmanifest'],
    STYLE_FILES: ['.css', '.scss', '.sass', '.less', '.styl', '.pcss', '.sss', '.wxss', '.acss'],
    CONFIG_FILES: ['.json', '.jsonc', '.yaml', '.yml', '.toml', '.config.*', 'config.*', '.editorconfig', '.browserslistrc', 'browserslist', '*ignore', '.gitattributes', '.gitmodules', '.env*', 'Dockerfile*', 'docker-compose*.yml', '.github/workflows/*.yml', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'composer.json', 'composer.lock', 'Cargo.toml', 'Cargo.lock', 'Gemfile', 'Gemfile.lock', '.eslintrc*', 'eslint.config.*', '.prettierrc*', 'prettier.config.*', '.stylelintrc*', 'stylelint.config.*', 'tsconfig*.json', '.babelrc*', 'babel.config.*', 'webpack.config.*', 'vite.config.*', 'rollup.config.*', 'next.config.*', 'nuxt.config.*', 'gatsby-config.*', 'gulpfile.*', '*/settings.json', '.vscode/**/*.json', '.idea/**/*.xml'],
    TEST_FILES: ['*.test.*', '*.spec.*', '*_test.*', '*_spec.*', '*-test.*', 'test-*.*', 'test.*', 'test/**/*', 'test_*.py', '*Test.php', '*Spec.scala', '__tests__/**/*', '__snapshots__/**/*', '__mocks__/**/*', 'tests/**/*', 'specs/**/*', 'jest.config.*', 'vitest.config.*', 'playwright.config.*', 'cypress.config.*', 'karma.conf.*', 'setupTests.*', 'test-setup.*', 'test.setup.*'],
    DOC_FILES: ['README*', 'readme*', 'LICENSE*', 'license*', 'COPYING*', 'NOTICE*', 'CHANGELOG*', 'changelog*', 'HISTORY*', 'RELEASES*', '.md', '.markdown', '.mdx', '.rst', '.adoc', '.asciidoc', '.txt', 'CONTRIBUTING*', 'contributing*', 'CODE_OF_CONDUCT*', 'code_of_conduct*', 'SECURITY*', 'SUPPORT*', 'docs/**/*', 'doc/**/*', '.github/ISSUE_TEMPLATE/**/*', '.github/PULL_REQUEST_TEMPLATE/**/*'],
};

/** Glob patterns excluded from every scan performed by this tool. */
const GLOBAL_EXCLUDES = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.lockb',
    '**/*.lock',
    '**/package-lock.json',
    '**/*.map',
    '**/*.png',
    '**/*.jpg',
    '**/*.ico',
    '**/*.gif',
    '**/*.mp4',
    '**/*.mp3',
    '**/*.pnpm-lock.yaml',
    '**/*.min.js',
    '**/*.js.map',
    '**/*.min.css',
    'coverage/**/*',
    'node_modules/**/*',
    'ALL/**/*',
    '**/.env',
    '*/ALL/**/*',
    '*/ALL_REBUILT/**/*',
    '**/.stylelintrc*',
    '**/stylelint.config.*',
    '**/__snapshots__/**/*',
    '**/__mocks__/**/*'
];

/** Scans the project, categorizes discovered file extensions, and writes a generated `jobs.toml`. */
class ConfigUpdater {
    private gitignore: string[] = [];
    private foundExtensions: Set<string> = new Set();

    /**
     * Convert glob-style gitignore patterns to simple regex for basic filtering
     *
     * @param filePath - Candidate path to check.
     * @returns Whether the path is ignored (matches `.gitignore` or a hardcoded exclusion).
     */
    private isIgnored(filePath: string): boolean {
        // Quick check against standard hardcoded exclusions
        if (filePath.includes('node_modules/') || filePath.includes('.git/')) return true;

        for (const pattern of this.gitignore) {
            const cleanPattern = pattern.replace(/^\//, '').replace(/\/$/, '');
            if (filePath.includes(cleanPattern)) {
                return true;
            }
        }
        return false;
    }

    /** Loads `.gitignore` patterns (if present) into {@link gitignore}. */
    private async loadGitignore(): Promise<void> {
        const gitignoreFile = Bun.file(Constants.GITIGNORE_PATH);
        if (await gitignoreFile.exists()) {
            const content = await gitignoreFile.text();
            this.gitignore = content.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
        }
    }

    /** Scans every file under `process.cwd()` and records its extension (or test-file pattern) into {@link foundExtensions}. */
    private async scanFiles(): Promise<void> {
        const glob = new Glob('**/*');

        // Bun.Glob is insanely fast for scanning directories
        for await (const file of glob.scan({ cwd: process.cwd(), onlyFiles: true })) {
            if (this.isIgnored(file)) continue;

            const isTestFile = CATEGORIES.TEST_FILES.some(testExt => file.endsWith(testExt));

            if (isTestFile) {
                const testExt = CATEGORIES.TEST_FILES.find(ext => file.endsWith(ext))!;
                this.foundExtensions.add(testExt);
            } else {
                const ext = extname(file).toLowerCase();
                if (ext) this.foundExtensions.add(ext);
            }
        }
    }

    /**
     * Builds the full `jobs.toml` content from every discovered extension,
     * bucketed into categories and formatted as job entries.
     *
     * @returns The generated TOML text.
     */
    private generateTOML(): string {
        const allFoundExts = Array.from(this.foundExtensions);
        const jobMappings: Record<string, string[]> = {
            SOURCE_FILES: [], WEB_FILES: [], STYLE_FILES: [], TERMINAL_FILES: [],
            CONFIG_FILES: [], DOC_FILES: [], TEST_FILES: [], MISC_FILES: []
        };

        // Categorize found extensions
        for (const ext of allFoundExts) {
            let categorized = false;
            for (const [category, extensions] of Object.entries(CATEGORIES)) {
                if (extensions.includes(ext)) {
                    jobMappings[category]!.push(`**/*${ext}`);
                    categorized = true;
                    break;
                }
            }
            if (!categorized) {
                jobMappings.MISC_FILES!.push(`**/*${ext}`);
            }
        }

        // Build the TOML string manually
        let tomlString = `theme = "dark"\n\noutputDir = "ALL"\nrebuiltDir = "ALL_REBUILT"\n\n`;

        // Format Global Excludes
        tomlString += `exclude = [\n`;
        tomlString += GLOBAL_EXCLUDES.map(ex => `  "${ex}"`).join(',\n');
        tomlString += `\n]\n\n`;

        const orderedJobNames = [
            'SOURCE_FILES', 'WEB_FILES', 'STYLE_FILES', 'TERMINAL_FILES',
            'CONFIG_FILES', 'DOC_FILES', 'TEST_FILES', 'MISC_FILES'
        ];

        let index = 1;
        for (const jobName of orderedJobNames) {
            const includeGlobs = jobMappings[jobName];

            const excludeGlobs = allFoundExts
                .filter(ext => !includeGlobs!.includes(`**/*${ext}`))
                .map(ext => `**/*${ext}`);

            const description = `Includes files matching: ${includeGlobs!.length > 0 ? includeGlobs!.join(', ') : 'None'}. Excludes all other project extensions.`;

            tomlString += `[[jobs]]\n`;
            tomlString += `filename = "${index}_${jobName}.txt"\n`;
            tomlString += `description = "${description}"\n`;

            tomlString += `include = [\n`;
            if (includeGlobs!.length > 0) tomlString += includeGlobs!.map(inc => `  "${inc}"`).join(',\n') + `\n`;
            tomlString += `]\n`;

            tomlString += `exclude = [\n`;
            if (excludeGlobs.length > 0) tomlString += excludeGlobs.map(ex => `  "${ex}"`).join(',\n') + `\n`;
            tomlString += `]\n\n`;

            index++;
        }

        return tomlString.trim() + '\n';
    }

    /** Orchestrates a full run: load `.gitignore`, scan files, generate TOML, and write it to {@link Constants.OUT_PATH}. */
    public async run(): Promise<void> {
        console.log('Loading .gitignore...');
        await this.loadGitignore();

        console.log('Scanning directories using Bun.Glob...');
        await this.scanFiles();

        const tomlData = this.generateTOML();

        const outFile = Bun.file(Constants.OUT_PATH);
        await Bun.write(outFile, tomlData);

        console.log(`Success! Configuration written to: ${Constants.OUT_PATH}`);
    }
}

// Execute the class
const updater = new ConfigUpdater();
updater.run().catch(console.error);
