export const pause = async (
    message = 'Press Enter to continue...',
): Promise<void> => {
    process.stdout.write(message);

    // Get a readable stream reader from Bun.stdin
    const reader = Bun.stdin.stream().getReader();

    // Wait until the user presses Enter, delivering a chunk of data
    await reader.read();

    // Release the lock on the stream so it can be reused later
    reader.releaseLock();
};
