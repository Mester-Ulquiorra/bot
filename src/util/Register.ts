import { Client } from "discord.js";
import { readdir } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import testMode from "../testMode.js";
import ConsoleCommand from "../types/ConsoleCommand.js";
import Event, { EventInvoker } from "../types/Event.js";
import SlashCommand from "../types/SlashCommand.js";
import Log, { LogType } from "../util/Log.js";

const commands = new Map<string, SlashCommand>();
const consoleCommands = new Map<string, ConsoleCommand>();

/**
 * A function for registering commands and events
 * @param commandPath The path to the commands folder.
 * @param eventPath The path to the events folder.
 * @param consoleCommandPath The path to the consolecommands folder.
 * @param client The bot client.
 */
async function Register(commandPath: string, eventPath: string, consoleCommandPath: string, client: Client) {
    readdir(commandPath, async (err, files) => {
        if (err) throw err;

        const commandFiles = files.filter((file) => file.endsWith(".js"));

        for (const commandFile of commandFiles) {
            const urlPath = pathToFileURL(join(commandPath, commandFile)).toString();
            try {
                const module: SlashCommand = (await import(urlPath)).default;

                if (testMode) console.log(module);
                commands.set(module.name, module);
            } catch (error) {
                Log(`Error while trying to load ${commandFile}: ${error.stack}`, LogType.Error);
            }
        }
    });

    readdir(consoleCommandPath, async (err, files) => {
        if (err) throw err;

        const consoleCommandFiles = files.filter((file) => file.endsWith(".js"));

        for (const consoleCommandFile of consoleCommandFiles) {
            const urlPath = pathToFileURL(join(consoleCommandPath, consoleCommandFile)).toString();
            try {
                const module: ConsoleCommand = (await import(urlPath)).default;

                if (testMode) console.log(module);
                consoleCommands.set(module.name, module);
            } catch (error) {
                Log(`Error while trying to load ${consoleCommandFile}: ${error.stack}`, LogType.Error);
            }
        }
    });

    readdir(eventPath, async (err, files) => {
        if (err) throw err;

        const eventFiles = files.filter((file) => file.endsWith(".js"));

        for (const eventFile of eventFiles) {
            const urlPath = pathToFileURL(join(eventPath, eventFile)).toString();
            try {
                const module: Event = (await import(urlPath)).default;

                if (testMode) console.log(module);
                client.on(module.name, EventInvoker.bind(module, module, client));
            } catch (error) {
                Log(`Error while trying to load ${eventFile}: ${error.stack}`, LogType.Error);
            }
        }
    });
}

export {
    commands,
    consoleCommands,
    Register,
};

