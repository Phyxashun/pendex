/**
 * @module App
 *
 * Single responsibility: wire up the interactive shell — load config,
 * build the command list, run the menu loop. This is the "root
 * component" in the React comparison: it mounts children (the commands)
 * and has almost no logic of its own, so — unlike Compile/Split — it's
 * NOT split into a separate service/view pair. Its only real behavior is
 * the select-loop, which is inherently both "state" (which command is
 * active) and "render" (the menu) at once; forcing those apart here would
 * add indirection without adding clarity. If that changes (e.g. the menu
 * grows real branching logic), split it the same way Compile/Split were.
 */

import * as CLACK from '@clack/prompts';
import { Compile } from '@pendex/compile';
import { Split } from '@pendex/split';
import type { Command, MainMenuOptions, State } from '@pendex/core';
import { resolveRunnerDeps } from '@pendex/core';
import { Exit } from '../commands/Exit';

/**
 * Process-wide singleton that owns the interactive CLI shell: the
 * command list, the active {@link State}, and the select-loop that
 * drives the main menu. Use {@link Application.getInstance} to obtain
 * it; the constructor is private.
 */
export class Application {
    private static instance: Application | null = null;

    /** User-facing copy for the main menu shell. */
    private readonly STRINGS = {
        exit: 'exit',
        title: ' PENDEX — PROJECT FILE CONSOLIDATOR ',
        mainMenu: 'Main Menu:',
        returnToMenu: 'Press Enter to return to main panel...',
    } as const;

    private _state!: State;
    private _commands: Command[] = [];
    private mainMenuOptions: MainMenuOptions[] = [];

    private constructor() {}

    /** Lazily creates (once per process) and returns the shared instance. */
    public static getInstance(): Application {
        if (!this.instance) {
            this.instance = new Application();
        }
        return this.instance;
    }

    /** Resets the singleton. Primarily useful for test isolation. */
    public static resetInstance(): void {
        this.instance = null;
    }

    /** The application's current state (theme, config, category colors). */
    public get state(): State {
        return this._state;
    }

    /** The available commands (Compile, Split, Exit) for this run. */
    public get commands(): Command[] {
        return this._commands;
    }

    /**
     * Resolves runner deps and builds the command list and menu options.
     * Must be called (directly or via {@link run}) before
     * {@link runSingleIteration}.
     *
     * @param exitFn - Function used by the Exit command to terminate the process.
     */
    public async init(exitFn: (code?: number) => void): Promise<void> {
        const deps = await resolveRunnerDeps();
        this._state = deps;
        this._commands = [
            new Compile(deps),
            new Split(deps),
            new Exit({ ...deps, exit: exitFn }),
        ];
        this.mainMenuOptions = this._commands.map(cmd => ({
            value: cmd.key,
            label: cmd.label,
            hint: cmd.hint,
        }));
    }

    /**
     * Executes one cycle of the main application loop.
     * Returns `false` if the loop should terminate, `true` otherwise.
     * This method is public specifically for robust testability.
     */
    public async runSingleIteration(): Promise<boolean> {
        console.clear();
        CLACK.intro(this.state.theme.title(this.STRINGS.title));

        const choice = await CLACK.select({
            message: this.state.theme(this.STRINGS.mainMenu).info,
            options: this.mainMenuOptions,
        });

        if (CLACK.isCancel(choice) || choice === this.STRINGS.exit) {
            return false; // Signal to terminate the loop
        }

        const command = this.commands.find(cmd => cmd.key === choice);
        if (command) {
            console.clear();
            await command.execute();

            const wantsToReturn = await CLACK.confirm({
                message: this.STRINGS.returnToMenu,
            });
            if (CLACK.isCancel(wantsToReturn) || !wantsToReturn) {
                return false; // Signal to terminate
            }
        }
        return true; // Signal to continue
    }

    /**
     * The main entry point for running the application.
     *
     * @param exitFn - Optional exit function (defaults to `process.exit`); used by the Exit command.
     */
    public async run(exitFn?: (code?: number) => void): Promise<void> {
        await this.init(exitFn ?? process.exit);

        while (await this.runSingleIteration()) {
            // This loop will continue as long as runSingleIteration() returns true.
        }

        // After the loop terminates, call the final exit command.
        const exitCmd = this.commands.find(cmd => cmd instanceof Exit);
        if (exitCmd) {
            await exitCmd.execute();
        }
    }
}

/** Shared {@link Application} instance used as the CLI's composition root. */
const App = Application.getInstance();
export default App;
