// FILE-PATH: packages/utils/src/components/App.ts
//
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

import { confirm, intro, isCancel, select } from '@clack/prompts';
import { Compile } from '@pendex/compile';
import type { Command, MainMenuOptions, State } from '@pendex/core';
import { resolveRunnerDeps, type ExitFn } from '@pendex/core';
import { Exit } from '@pendex/exit';
import { Split } from '@pendex/split';

/**
 * Clear the console before displaying the menu
 * Insert a blank line before displaying the menu
 */
const clear: () => void = (): void => {
    console.clear();
    console.log();
};

/**
 * Process-wide singleton that owns the interactive CLI shell: the
 * command list, the active {@link State}, and the select-loop that
 * drives the main menu. Use {@link Application.getInstance} to obtain
 * it; the constructor is private.
 */
export class Application {
    private static instance: Application | null = null;

    private readonly STRINGS = {
        title: '  PENDEX — PROJECT FILE CONSOLIDATOR ',
        mainMenu: 'Main Menu:',
        returnToMenu: 'Press Enter to return to main panel...',
        exit: 'exit',
    } as const;

    private _state!: State;
    private _commands: Command[] = [];
    private mainMenuOptions: MainMenuOptions[] = [];

    private constructor() {}

    /**
     * Create and/or return the singleton
     */
    public static getInstance(): Application {
        return this.instance ?? new Application();
    }

    /**
     * Reset the singleton
     * Useful for test isolation
     */
    public static resetInstance(): void {
        this.instance = null;
    }

    /**
     * The application's current state
     * (theme, config, category colors)
     */
    public get state(): State {
        return this._state;
    }

    /**
     * The available commands (Compile, Split, Exit) for this run.
     */
    public get commands(): Command[] {
        return this._commands;
    }

    /**
     * Resolves runner deps and builds the command list and menu options.
     * Must be called (directly or via {@link run}) before
     * {@link runSingleIteration}.
     *
     * @param exitFn - Function used by the Exit command
     * to terminate the process.
     */
    public async init(exitFn: ExitFn): Promise<void> {
        this._state = await resolveRunnerDeps();

        this._commands = [
            new Compile(this.state),
            new Split(this.state),
            new Exit({
                ...this.state,
                exit: exitFn,
                exitCode: 0,
            }),
        ];

        this.mainMenuOptions = this.commands.map(
            (cmd: Command): MainMenuOptions => ({
                value: cmd.key,
                label: cmd.label,
                hint: cmd.hint,
            }),
        );
    }

    public async returnToMenu(): Promise<boolean> {
        const wantsToReturn: symbol | boolean = await confirm({
            message: this.STRINGS.returnToMenu,
        });

        if (isCancel(wantsToReturn) || !wantsToReturn) {
            return false;
        }
        return true;
    }

    /**
     * Executes one cycle of the main application loop.
     * Returns `false` if the loop should terminate, `true` otherwise.
     * This method is public specifically for robust testability.
     */
    public async runSingleIteration(): Promise<boolean> {
        clear();

        // Display app title
        intro(this.state.theme.title(this.STRINGS.title));

        // Display choices and get user's choice
        const choice: string | symbol = await select({
            message: this.state.theme.info(this.STRINGS.mainMenu),
            options: this.mainMenuOptions,
        });

        // Handle exit
        if (isCancel(choice) || choice === this.STRINGS.exit) {
            return false;
        }

        // Find the correct command based on the user's choice
        const command: Command | undefined = this.commands.find(
            (cmd: Command): boolean => cmd.key === choice,
        );

        // If a command is found, execute
        if (command) {
            clear();
            await command.execute();
        }
        return await this.returnToMenu();
    }

    /**
     * The main entry point for running the application.
     *
     * @param exitFn - Optional exit function (defaults to `process.exit`)
     */
    public async run(exitFn?: ExitFn): Promise<void> {
        await this.init(exitFn ?? process.exit.bind(process));

        while (await this.runSingleIteration()) {
            /*
             * This loop will continue as long as
             * runSingleIteration() returns true.
             */
        }

        // After the loop terminates, call the final exit command.
        const exitCmd: Exit = this.commands.find(
            (cmd: Command): cmd is Exit => cmd instanceof Exit,
        ) as Exit;

        if (exitCmd) await exitCmd.execute();
    }
}

/**
 * Shared {@link Application} instance used as the CLI's composition root.
 */
const App = Application.getInstance();
export { App };
