// canvas must be loaded before sharp is initalized
import { Logger } from "@mester-ulquiorra/commonlib";
import "@napi-rs/canvas";
import { fileURLToPath } from "bun";
import * as deepl from "deepl-node";
import { Client } from "discord.js";
import Mongoose from "mongoose";
import { Snowflake } from "nodejs-snowflake";
import { join } from "path";
import puppeteer from "puppeteer";
import { createInterface } from "readline";
import config from "./config.js";
import "./database.js";
import AutoUnpunish from "./util/AutoUnpunish.js";
import CleanTickets from "./util/CleanTickets.js";
import { HandleConsoleCommand } from "./util/ConsoleUtils.js";
import { Register } from "./util/Register.js";
import ServerStats from "./util/ServerStats.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const logger = new Logger(join(__dirname, "..", "logs"));
// this is a really bad way of avoiding errors, but it is what it is
process.on("uncaughtException", (error) => {
    logger.log(`An uncaught exception has occured, ignoring, but may cause issues...\n${error.stack}`, "warn");
});

process.on("exit", () => {
    browser.close();
});

console.time("Boot");
logger.log("And thus, an Espada was born...");

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
    ],
    allowedMentions: {
        parse: ["roles", "users"],
        repliedUser: true
    }
});
// ------------------------------------------

const SnowFlake = new Snowflake({ custom_epoch: config.SnowflakeEpoch });
const DeeplTranslator = new deepl.Translator(config.DANGER.DEEPL_KEY);

// Set up puppeteer
const browser = await puppeteer.launch({
    headless: "new",
    args: [
        ...config.puppeteerArgs
    ]
});

function shutdown(reason: string) {
    logger.log(`Shutting down client: ${reason}`, "fatal");
    Ulquiorra.destroy();
    Mongoose.disconnect();
    process.exit(1);
}

logger.log("Loading commands and events...");

// register commands and events
Register(
    join(__dirname, "commands"),
    join(__dirname, "events"),
    join(__dirname, "consolecommands"),
    Ulquiorra
).then(() => {
    Ulquiorra.login(config.DANGER.TOKEN).then(async () => {
        setInterval(() => {
            Ulquiorra.user.setActivity({
                name: `Version ${config.Version}`,
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

export {
    DeeplTranslator, SnowFlake, browser, logger, shutdown
};
export default Ulquiorra;