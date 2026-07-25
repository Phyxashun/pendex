
import App from './components/App';

export const Message = (msg: unknown): void => {
    if (msg instanceof Error) {
        console.error(`Fatal crash: ${msg.message}`);
    } else {
        console.error(`Fatal crash: ${msg}`);
    }
};

/**
 * MAIN ENTRY POINT
 */
// c8 ignore start
if (import.meta.main) {
    try {
        await App.run();
    } catch (err) {
        Message(err);
        process.exit(1);
    }
}
// c8 ignore stop
