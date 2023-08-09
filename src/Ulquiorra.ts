import { Logger } from "@mester-ulquiorra/commonlib";
import * as deepl from "deepl-node";
import "discord.js";
import { ActivityType, Client } from "discord.js";
import mongoose from "mongoose";
import { Snowflake } from "nodejs-snowflake";
import { join } from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import config from "./config.js";
import "./database.js";
import testMode from "./testMode.js";
import AutoUnpunish from "./util/AutoUnpunish.js";
import CleanTickets from "./util/CleanTickets.js";
import { Register } from "./util/Register.js";
import ServerStats from "./util/ServerStats.js";
import { createInterface } from "readline";
import { HandleConsoleCommand } from "./util/ConsoleUtils.js";
import "./util/Internal.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const logger = new Logger(join(__dirname, "..", "logs"));

// this is a really bad way of avoiding errors, but it is what it is
process.on("uncaughtException", (error) => {
	logger.log(`An uncaught exception has occured, ignoring, but may cause issues...\n${error.stack}`, "warn");
});

console.time("Boot");
logger.log(`And thus, ${testMode ? "a testing" : "an"} Espada was born...`);

/* ------ Set up client ------ */
const Ulquiorra = new Client({
	intents: [
		"Guilds",
		"GuildMembers",
		"GuildBans",
		"GuildMessages",
		"GuildVoiceStates",
		"GuildMessageReactions",
		"DirectMessages",
		"MessageContent",
	],
	allowedMentions: {
		parse: ["roles", "users"],
		repliedUser: true,
	},
	presence: {
		activities: [
			{
				name: `Version ${config.Version}`,
				type: ActivityType.Playing,
			},
		],
	},
});
// ------------------------------------------

const SnowFlake = new Snowflake({ custom_epoch: config.SnowflakeEpoch });
const DeeplTranslator = new deepl.Translator(config.DANGER.DEEPL_KEY);

// Set up puppeteer
const browser = await puppeteer
	.launch({
		headless: "new",
		args: [...config.puppeteerArgs],
	})
	.catch(() => {
		logger.log("Could not launch puppeteer, some functionalities might not work", "warn");
		return null as puppeteer.Browser;
	});

process.on("exit", () => {
	browser?.close();
});

function shutdown(reason: string) {
	logger.log(`Shutting down client: ${reason}`, "fatal");
	Ulquiorra.destroy();
	mongoose.disconnect();
	process.exit(0);
}

function GetResFolder() {
	return join(__dirname, "..", "res");
}

logger.log("Loading commands and events...");

// register commands and events
Register(join(__dirname, "commands"), join(__dirname, "events"), join(__dirname, "consolecommands")).then(async () => {
	logger.log("Logging in...");
	await Ulquiorra.login(config.DANGER.TOKEN);

	setInterval(
		() => {
			ServerStats();
		},
		1000 * 60 * 10
	); // 10 minutes

	setInterval(
		() => {
			CleanTickets();
		},
		1000 * 60 * 10
	); // 10 minutes

	setInterval(() => {
		AutoUnpunish();
	}, 1000 * 60); // 1 minute

	try {
		createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: false,
		}).on("line", (line) => {
			HandleConsoleCommand(line, Ulquiorra);
		});
	} catch (err) {
		logger.log(`Failed to start console, console commands are unavailable: ${err.stack}`, "error");
	}
});

export { DeeplTranslator, SnowFlake, browser, logger, shutdown, GetResFolder };
export default Ulquiorra;
