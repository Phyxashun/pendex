import { $, Glob } from "bun";

/**
 * Logs a fatal, uncaught error to the console in a consistent format.
 *
 * @param msg - The error (or arbitrary thrown value) to report.
 */
export const Message = (msg: unknown): void => {
    if (msg instanceof Error) {
        console.error(`Fatal crash: ${msg.message}`);
    } else {
        console.error(`Fatal crash: ${msg}`);
    }
};

/**
 * Gracefully empties directory contents when the directory itself is
locked by Windows.
 * Uses Bun-native shell execution which automatically handles OS differences.
 */
const emptyDirectoryContents = async (dirPath: string): Promise<void> => {
    try {
        // Bun Shell supports globbing and natively executes cleanups cross-platform
        await $`rm -rf ${dirPath}/*`;
    } catch (err) {
        console.error(`Could not empty locked directory ${dirPath}:`, err);
    }
};

const main = async () => {
    const nodeGlob = new Glob("**/node_modules");
    const bunGlob = new Glob("**/*.{lock,lockb}");

    // Using Bun's global "import.meta.dir" to ensure absolute execution paths
    const projectRoot = import.meta.dir || ".";

    console.log("Scanning for node_modules...");
    for await (const rawPath of nodeGlob.scan({ cwd: projectRoot, onlyFiles: false })) {
        console.log("Removing Directory: ", rawPath);

        try {
            // This moves the directory safely to your OS Recycle Bin/Trash
            await trash(rawPath);
        } catch (err: any) {
            // Handle locked directory fallback safely
            if (err.message?.includes("EACCES") || err.message?.includes("permission denied")) {
                console.warn(`⚠️  Directory is locked by system. Attempting to empty contents of: ${rawPath}`);
                await emptyDirectoryContents(rawPath);
            } else {
                console.error(`Failed to remove ${rawPath}:`, err);
            }
        }
    }

    console.log("Scanning for lockfiles...");
    for await (const rawPath of bunGlob.scan({ cwd: projectRoot })) {
        console.log("Removing File: ", rawPath);
        try {
            await $`rm -f ${rawPath}`;
        } catch (err) {
            console.error(`Failed to remove ${rawPath}:`, err);
        }
    }

    console.log("✨ Clean completed successfully!");
};

/**
 * MAIN ENTRY POINT
 */
// c8 ignore start
if (import.meta.main) {
    try {
        await main();
    } catch (err) {
        Message(err);
        process.exit(1);
    }
}
// c8 ignore stop
