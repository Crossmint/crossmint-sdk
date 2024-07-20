import { Command } from "commander";

import { libCommand } from "./commands/lib";

const COMMANDS: Command[] = [libCommand];

function init() {
    const program = new Command();
    COMMANDS.forEach((command) => program.addCommand(command));
    program.parse(process.argv);
}

init();
