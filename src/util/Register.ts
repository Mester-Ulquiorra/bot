import { Client } from "discord.js";
import { readdir } from "fs";
import { join } from "path";
import test_mode from "../test_mode"
import ConsoleCommand from "../types/ConsoleCommand";
import SlashCommand from "../types/SlashCommand";
import Log, { LogType } from "../util/Log";

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
        if(err) throw err;

        const commandFiles = files.filter((file) => file.endsWith(".js"));

        for (const commandFile of commandFiles) {
            try {
                const command = (await import(join(commandPath, commandFile))).default;

                if(test_mode) console.log(command);

                commands.set(command.name, command);
            } catch (error) {
                Log(`Error while trying to load ${commandFile}: ${error.stack}`, LogType.Error);
            }
        }
    });

    readdir(consoleCommandPath, async (err, files) => {
        if(err) throw err;

        const consoleCommandFiles = files.filter((file) => file.endsWith(".js"));

        for (const consoleCommandFile of consoleCommandFiles) {
            try {
                const consoleCommand = (await import(join(consoleCommandPath, consoleCommandFile))).default;

                if(test_mode) console.log(consoleCommand);

                consoleCommands.set(consoleCommand.name, consoleCommand);
            } catch (error) {
                Log(`Error while trying to load ${consoleCommandFile}: ${error.stack}`, LogType.Error);
            }
        }
    });

    readdir(eventPath, async (err, files) => {
        if(err) throw err;

        const eventFiles = files.filter((file) => file.endsWith(".js"));

        for (const eventFile of eventFiles) {
            try {
                const event = (await import(join(eventPath, eventFile))).default;

                if(test_mode) console.log(event);

                // also add the event to the client as a listener
                client.on(event.name, event.run.bind(event, client));
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
