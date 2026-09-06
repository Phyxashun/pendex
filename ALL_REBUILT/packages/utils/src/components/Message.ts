export type MessageFn = (msg: unknown) => void;

/**
 * Logs a fatal, uncaught error to the console in a consistent format.
 *
 * @param msg - The error (or arbitrary thrown value) to report.
 */
export const Message: MessageFn = (msg: unknown): void => {
    if (msg instanceof Error) {
        console.error(`Fatal crash: ${msg.message}`);
    } else {
        const formattedMsg =
            typeof msg === 'object' && msg !== null
                ? JSON.stringify(msg)
                : String(msg);

        console.error(`Fatal crash: ${formattedMsg}`);
    }
};
