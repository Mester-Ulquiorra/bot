import { Client } from "discord.js";
import { consoleCommands } from "./Register.js";

/**
 * The main function for console commands.
 * @param {string} line The line to process.
 * @param {Client} client The bot client.
 */
export function HandleConsoleCommand(line: string, client: Client) {
	// get the command name by getting the first words from the command
	// then get the argument by splitting the command by spaces
	const args = line.trim().split(" ");
	const commandName = args.shift();

	if (!commandName || commandName.length === 0) return;

	// check if commandName is help
	if (commandName === "help") {
		console.log("Name - Usage - Description");
		console.log("Some commands might be dangerous, so don't be a moron, please.");
		console.log("----------------------------------------------------");

		// go through every command and run its getHelp function
		for (const [_, command] of consoleCommands) {
			console.log(`${command.name} | ${command.help ?? "no help available"}`);
		}

		console.log("----------------------------------------------------");
		return;
	}

	// if the command was not found, show an error message
	if (!consoleCommands.has(commandName)) {
		console.log(`Command ${commandName} not found.`);
		return;
	}

	const command = consoleCommands.get(commandName);
	if (!command) return;

	command.run(args, client).catch((error: Error) => {
		console.error(error);
	});
}
