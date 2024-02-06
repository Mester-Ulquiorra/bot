import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import Ulquiorra, { logger } from "../Ulquiorra.js";
import testMode from "../testMode.js";
import ConsoleCommand from "../types/ConsoleCommand.js";
import SlashCommand from "../types/SlashCommand.js";

const commands = new Map<string, SlashCommand>();
const consoleCommands = new Map<string, ConsoleCommand>();

type ModuleType = "slash" | "console" | "event";

/**
 * A function for registering commands and events
 * @param commandPath The path to the commands folder.
 * @param eventPath The path to the events folder.
 * @param consoleCommandPath The path to the consolecommands folder.
 */
async function Register(commandPath: string, eventPath: string, consoleCommandPath: string) {
    return Promise.all([processFiles(eventPath, "event"), processFiles(commandPath, "slash"), processFiles(consoleCommandPath, "console")]);
}

async function processFiles(root: string, type: ModuleType) {
    const filteredFiles = readdirSync(root).filter((file) => file.endsWith(".js") || (file.endsWith(".ts") && !file.startsWith("#")));

    for (const file of filteredFiles) {
        const urlPath = pathToFileURL(join(root, file)).toString();
        loadModule(urlPath, type).catch((error) => {
            logger.log(`Error while trying to load ${file}: ${error.stack}`, "error");
        });
    }
}

async function loadModule(urlPath: string, type: ModuleType) {
    const module = (await import(urlPath)).default;
    if (testMode) {
        console.log(module);
    }

    if (type === "slash") {
        commands.set(module.name, module);
    }
    if (type === "console") {
        consoleCommands.set(module.name, module);
    }
    if (type === "event") {
        Ulquiorra.on(module.name, (...args) => {
            module.run(Ulquiorra, ...args).catch((error: Error) => {
                logger.log(`Error while trying to run ${module.name}: ${error.stack}`, "error");
            });
        });
    }
}

export { commands, consoleCommands, Register };
