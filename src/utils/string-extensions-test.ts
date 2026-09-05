import { errorNote } from './errorNote';

import { intro, log, outro } from '@clack/prompts';
import { Colors } from '@pendex/color';

import './string-extensions';
import type { PathSegment } from './string-extensions';

// DEBUG START

/**
 * Runs a suite of test cases to thoroughly validate the
 * custom String extension methods.
 * Logs detailed pass/fail results directly to the console.
 */
export const testPathExtensions = async (): Promise<void> => {
    interface TestCase {
        name: string;
        input: string;
        segments?: PathSegment[];
        expectedPosix: string;
        expectedNormalized: string;
    }

    const testCases: TestCase[] = [
        {
            name: "Standard Windows Path",
            input: "C:\\Users\\Admin\\Documents\\projects",
            expectedPosix: "C:/Users/Admin/Documents/projects",
            expectedNormalized: "C:/Users/Admin/Documents/projects"
        },
        {
            name: "Mixed Slashes",
            input: "src\\components/buttons\\SubmitButton.tsx",
            expectedPosix: "src/components/buttons/SubmitButton.tsx",
            expectedNormalized: "src/components/buttons/SubmitButton.tsx"
        },
        {
            name: "Consecutive Slashes (Internal)",
            input: "folder/subfolder//nested///file.txt",
            expectedPosix: "folder/subfolder//nested///file.txt",
            expectedNormalized: "folder/subfolder/nested/file.txt"
        },
        {
            name: "Windows UNC Network Share",
            input: "\\\\server\\share\\folder",
            expectedPosix: "//server/share/folder",
            expectedNormalized: "//server/share/folder"
        },
        {
            name: "Web Protocol (HTTP)",
            input: "http://example.com",
            expectedPosix: "http://example.com",
            expectedNormalized: "http://example.com"
        },
        {
            name: "Windows Drive Letter with Double Slash",
            input: "C:\\\\folder\\\\subfolder",
            expectedPosix: "C://folder//subfolder",
            expectedNormalized: "C:/folder/subfolder"
        },
        {
            name: "Trailing Slashes",
            input: "usr/local/bin//",
            expectedPosix: "usr/local/bin//",
            expectedNormalized: "usr/local/bin/"
        },
        {
            name: "joinPath: Standard Append",
            input: "src",
            segments: ["components", "Button.tsx"],
            expectedPosix: "src/components/Button.tsx",
            expectedNormalized: "src/components/Button.tsx"
        },
        {
            name: "joinPath: Falsy Conditions & Numbers",
            input: "src",
            segments: ["v1", false && "premium", "users", 404],
            expectedPosix: "src/v1/users/404",
            expectedNormalized: "src/v1/users/404"
        },
        {
            name: "joinPath: Mixed Backslashes in Segments",
            input: "src",
            segments: ["assets\\images", "logo.png"],
            expectedPosix: "src/assets/images/logo.png",
            expectedNormalized: "src/assets/images/logo.png"
        },
        /**
         * PURPOSEFULLY FAILING TESTS
         */
        {
            name: "Intentional Failure: Incorrect Mapped Path",
            input: "C:\\Users\\Guest",
            expectedPosix: "C:/Wrong/Path/Here",
            expectedNormalized: "C:/Wrong/Path/Here"
        },
        {
            name: "Intentional Failure: joinPath Output Mismatch",
            input: "dist",
            segments: ["bundles", "app.js"],
            expectedPosix: "dist/wrong/app.js",
            expectedNormalized: "dist/wrong/app.js"
        }
    ];

    console.log();
    intro(Colors.bgYellow(Colors.black(Colors.bold('STRING EXTENSIONS TESTING'))));

    const deferredFailures: any[] = [];

    // Process tasks sequentially to retain full control
    // over failures without process abandonment
    for (const [index, test] of testCases.entries()) {
        const actualPosix = test.segments
            ? test.input.joinPath(...test.segments)
            : test.input.toPosixPath();

        const actualNormalized = test.segments
            ? actualPosix
            : test.input.normalizePath();

        const posixPassed = actualPosix === test.expectedPosix;
        const normalizedPassed = actualNormalized === test.expectedNormalized;

        const passedTag = Colors.green('Passed');
        const failedTag = Colors.red('Failed');
        const testNumber = Colors.cyan(`Test #${index + 1}`);
        const testName = Colors.magenta(`${test.name}`);

        if (!posixPassed || !normalizedPassed) {
            deferredFailures.push({
                name: test.name,
                input: test.input,
                segments: test.segments,
                posix: !posixPassed,
                normalized: !normalizedPassed,
                expectedPosix: test.expectedPosix,
                actualPosix,
                expectedNormalized: test.expectedNormalized,
                actualNormalized
            });

            log.error(`${failedTag}...${testNumber}: ${testName}`);
        } else {
            log.success(`${passedTag}...${testNumber}: ${testName}`);
        }
    }

    const completed = () => {
        const complete = '🎉 All path extension tests passed successfully!';
        outro(Colors.green(Colors.bold(complete)));
    };

    try {
        if (deferredFailures.length > 0) {
            throw new Error(JSON.stringify(deferredFailures));
        }
        completed();
    } catch (error: any) {
        const errorTitle = 'Test Suite Completed with Failures:';
        log.error(Colors.bgRed(Colors.black(Colors.bold(errorTitle))));

        let failuresToPrint: any[];

        try {
            failuresToPrint = JSON.parse(error.message);
        } catch {
            console.error(error);
            outro(Colors.red('Fatal infrastructure failure occurred.'));
            process.exit(1);
        }

        for (const details of failuresToPrint) {
            const lines: [string, string][] = [
                ['Input'.label(), `"${details.input}"`]
            ];

            if (details.segments) {
                lines.push(
                    ['Segments'.label(), JSON.stringify(details.segments)]
                );
            }
            if (details.posix) {
                lines.push(
                    ['Expected Posix'.label(), `"${details.expectedPosix}"`]
                );
                lines.push(
                    ['Got Posix'.label(), `"${details.actualPosix}"`.red()]
                );
            }
            if (details.normalized) {
                lines.push(
                    ['Expected Normalized'.label(), `"${details.expectedNormalized}"`]
                );
                lines.push(
                    ['Got Normalized'.label(), `"${details.actualNormalized}"`.red()]
                );
            }

            const maxLength = Math.max(...lines.map(([label]) => label.length));
            const noteContent = lines
                .map(([label, value]) => `${label.padEnd(maxLength)} : ${value}`)
                .join('\n');

            errorNote(noteContent, Colors.red(`Failure Details: ${details.name}`));
        }

        log.error(Colors.red('Process terminated due to test failures.'));
    }

    completed();
};

// Execute the tests
export const runTests = async () => {
    try {
        await testPathExtensions();
        console.log('TESTING COMPLETE!!!');
        process.exit(0);
    } catch (err: any) {
        console.error(err);
        process.exit(1);
    }
    process.exit(0);
};

//runTests();

// DEBUG END
