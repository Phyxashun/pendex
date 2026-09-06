import { type Glob } from 'bun';

const INPUT_DIR = './ALL/';
const OUTPUT_FILE = './ALL/0_CONSOLIDATED_TEXT_FILES.txt';

async function consolidateFiles(): Promise<void> {
    try {
        // Initialize a built-in Bun Glob for text files
        const glob: Glob = new Bun.Glob('*.txt');

        const txtFiles: string[] = [];

        // Scan the target directory using Bun's built-in scanner
        for await (const filename of glob.scan({
            cwd: INPUT_DIR,
        })) {
            txtFiles.push(filename);
        }

        if (txtFiles.length === 0) {
            console.log('No .txt files found in the directory.');
            return;
        }

        let combinedContent: string = '';

        // Read content from each file using Bun.file
        for (const filename of txtFiles) {
            const filePath: string = `${INPUT_DIR}${filename}`;
            const fileText: string = await Bun.file(filePath).text();

            // Add content with a newline separator
            combinedContent += `/**\n *\tContent from ${filename}\n */\n${fileText}\n\n`;
        }

        // Write the consolidated content to the output file
        await Bun.write(OUTPUT_FILE, combinedContent);
        console.log(
            `Success! Consolidated ${txtFiles.length} files into ${OUTPUT_FILE}`,
        );
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// c8 ignore start
if (import.meta.main) {
    try {
        await consolidateFiles();
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}
// c8 ignore stop
