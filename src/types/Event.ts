import { Client } from "discord.js";

interface Event {
	/**
	 * The name of the event (same as the Discord.JS event names)
	 */
	name: string;
	/**
	 * The main function that executes when the event is run
	 */
	run: (client: Client, ...args: Array<object>) => Promise<void>;
}

export default Event;
