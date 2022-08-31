import { Client } from "discord.js";
import { config as dotconfig } from "dotenv";
import { join } from "path";
import { Register } from "./util/Register";
import test_mode from "./test_mode";
import Log, { LogType } from "./util/Log";
import Mongoose from "mongoose";
import config from "./config";
import { Snowflake } from "nodejs-snowflake";
import ServerStats from "./util/ServerStats";
import AutoUnpunish from "./util/AutoUnpunish";
import CleanTickets from "./util/CleanTickets";
import { createInterface } from "readline";
import { HandleConsoleCommand } from "./util/ConsoleUtil";

dotconfig({
	path: join(__dirname, "..", test_mode ? ".env.test" : ".env")
});

console.time("Boot");
Log("And thus, an Espada was born...");

/* ------ Set up client and MongoDB ------ */
const Ulquiorra = new Client({
	intents: [
		"Guilds",
		"GuildMembers",
		"GuildBans",
		"GuildMessages",
		"GuildVoiceStates",
		"GuildMessageReactions",
		"DirectMessages",
		"MessageContent"
	]
});

Mongoose.connect(`mongodb+srv://discordbot:${process.env.DB_PASS}@${process.env.DB_URL}/discord-database?retryWrites=true&w=majority`).catch(() => {
	Log("An error has happened while trying to connect to the database, which is a fatal issue. Terminating...", LogType.Fatal);
	shutdown("MongoDB connection error");
});
// ------------------------------------------

const SnowFlake = new Snowflake({ custom_epoch: config.SNOWFLAKE_EPOCH });

function shutdown(reason: string) {
	Log(`Shutting down client: ${reason}`, LogType.Fatal);
	Ulquiorra.destroy();
	Mongoose.disconnect();
	process.exit(1);
}

Log("Loading commands and events...");

// register commands and events
Register(
	join(__dirname, "commands"),
	join(__dirname, "events"),
	join(__dirname, "consolecommands"),
	Ulquiorra
).then(() => {
	Ulquiorra.login(process.env.TOKEN).then(async () => {
		setInterval(() => {
			Ulquiorra.user.setActivity({
				name: `Version ${config.VERSION}`,
			});
		}, 1000 * 60 * 60); // 1 hour

		setInterval(() => {
			ServerStats();
		}, 1000 * 60 * 10); // 10 minutes

		setInterval(() => {
			CleanTickets();
		}, 1000 * 60 * 10); // 10 minutes

		setInterval(() => {
			AutoUnpunish();
		}, 1000 * 60); // 1 minute
	});

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});

	rl.on("line", (line) => {
		HandleConsoleCommand(line, Ulquiorra);
	});
});

// this is a really bad way of avoiding errors, but it is what it is
process.on("uncaughtException", (error) => {
	Log(`An uncaught exception has occured, ignoring, but may cause issues... ${error.stack}`, LogType.Warn);
})

export { 
	shutdown,
	SnowFlake
}
export default Ulquiorra;