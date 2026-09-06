import { join } from 'path';

// Get command line arguments
const [, , filePath] = Bun.argv;

if (!filePath) {
    console.error(
        '❌ Please provide a file path. Usage: bun censor.ts <file-path>',
    );
    process.exit(1);
}

try {
    // Resolve absolute path and load file
    const absolutePath = join(process.cwd(), filePath);
    const file = Bun.file(absolutePath);

    if (!(await file.exists())) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    const text = await file.text();

    // Regex to match URLs (http, https, and www)
    const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*|www\.[^\s$.?#].[^\s]*/gi;

    // Replace links and track changes
    let count = 0;
    const censoredText = text.replace(urlRegex, () => {
        count++;
        return 'WEBSITE';
    });

    // Write changes back to the same file
    await Bun.write(absolutePath, censoredText);

    console.log(
        `✅ Success! Replaced ${count} website address(es) in ${filePath}`,
    );
} catch (error) {
    console.error(
        '❌ An error occurred:',
        error instanceof Error ? error.message : error,
    );
}
