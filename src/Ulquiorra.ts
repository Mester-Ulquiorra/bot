import { generateDependencyReport } from "@discordjs/voice";
import * as deepl from "deepl-node";
import { ActivityType, Client } from "discord.js";
import mongoose from "mongoose";
import { Snowflake } from "nodejs-snowflake";
import { join } from "path";
import puppeteer from "puppeteer";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { logger } from "./bootstrap.js";
import testMode from "./testMode.js";
import AutoUnpunish from "./util/AutoUnpunish.js";
import CleanTickets from "./util/CleanTickets.js";
import { HandleConsoleCommand } from "./util/ConsoleUtils.js";
import "./util/Internal.js";
import { Register } from "./util/Register.js";
import ServerStats from "./util/ServerStats.js";
import config from "./config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// this is a really bad way of avoiding errors, but it is what it is
process.on("uncaughtException", (error) => {
    logger.log(`An uncaught exception has occured, ignoring, but may cause issues...\n${error.stack}`, "warn");
});

console.time("Boot");
logger.log(`And thus, ${testMode ? "a testing" : "an"} Espada was born...`);

if (testMode) {
    console.log(generateDependencyReport());
}

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
        "GuildInvites"
    ],
    allowedMentions: {
        parse: ["roles", "users"],
        repliedUser: true
    },
    presence: {
        activities: [
            {
                name: `Version ${config.Version}`,
                type: ActivityType.Custom,
                state: `If you have any questions, just ping me :) \n Version ${config.Version}`
            }
        ]
    }
});
// ------------------------------------------

const SnowFlake = new Snowflake({ custom_epoch: config.SnowflakeEpoch });
const DeeplTranslator = new deepl.Translator(config.DANGER.DEEPL_KEY);

// Set up puppeteer
const browser = await puppeteer
    .launch({
        headless: "new",
        args: [...config.puppeteerArgs]
    })
    .catch(() => {
        logger.log("Could not launch puppeteer, some functionalities might not work", "warn");
        return null;
    });

function shutdown(reason?: string) {
    if (reason) {
        logger.log(`Shutting down client: ${reason}`, "fatal");
    }
    browser?.close();
    Ulquiorra.destroy();
    mongoose.disconnect();
    process.exit(0);
}

function GetResFolder() {
    return join(__dirname, "..", "res");
}

logger.log("Started loading...");

// register commands and events
Register(join(__dirname, "commands"), join(__dirname, "events"), join(__dirname, "consolecommands")).then(async () => {
    logger.log("Logging in...");
    await Ulquiorra.login(config.DANGER.TOKEN);

    setInterval(() => {
        ServerStats();
        CleanTickets();
    }, 600_000); // 10 minutes

    setInterval(() => {
        AutoUnpunish();
    }, 60_000); // 1 minute

    try {
        createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        }).on("line", (line) => {
            HandleConsoleCommand(line, Ulquiorra);
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            logger.log(`Failed to start console, console commands are unavailable: ${err.message}, ${err.stack ?? "no stack"}`, "error");
        }
    }
});

// set up automatic shutdown when process is terminated
process.on("exit", () => {
    shutdown();
});
process.on("SIGINT", () => {
    shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    shutdown("SIGTERM");
});

export { DeeplTranslator, GetResFolder, SnowFlake, browser, shutdown, logger };
export default Ulquiorra;
