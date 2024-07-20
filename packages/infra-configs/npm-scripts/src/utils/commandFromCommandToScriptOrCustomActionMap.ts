import { Argument, Command, Option } from "commander";

import { spawnScript } from "./spawnScript";

export type CustomAction = { callback: (...args: any[]) => void; options?: Option[]; arguments?: Argument[] };
export type CommandToScriptOrCustomActionMap = Record<string, string | CustomAction>;

export function commandFromCommandToScriptOrCustomActionMap(
    commandName: string,
    commandToScriptOrCustomActionMap: CommandToScriptOrCustomActionMap
) {
    const command = new Command(commandName);

    Object.entries(commandToScriptOrCustomActionMap).forEach(([commandName, scriptOrCustomAction]) => {
        if (typeof scriptOrCustomAction === "string") {
            return command.command(commandName).action((...args) => spawnScript(scriptOrCustomAction, ...args));
        }
        const action = command.command(commandName).action(scriptOrCustomAction.callback);
        scriptOrCustomAction.options?.forEach((option) => {
            action.addOption(option);
        });
        scriptOrCustomAction.arguments?.forEach((arg) => {
            action.addArgument(arg);
        });
    });
    return command;
}
