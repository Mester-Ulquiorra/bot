import { Client } from "discord.js";

interface ConsoleCommand {
	name: string;
	help?: string;
	run: (args: Array<string | number | object>, client: Client) => Promise<void>;
}

export default ConsoleCommand;
