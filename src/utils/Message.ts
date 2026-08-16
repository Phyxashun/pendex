/**
 * Logs a fatal, uncaught error to the console in a consistent format.
 *
 * @param msg - The error (or arbitrary thrown value) to report.
 */
const Message = (msg: unknown): void => {
    if (msg instanceof Error) {
        console.error(`Fatal crash: ${msg.message}`);
    } else {
        console.error(`Fatal crash: ${msg}`);
    }
};

export default Message;
