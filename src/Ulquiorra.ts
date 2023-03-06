import "canvas";
import * as deepl from "deepl-node";
import { Client } from "discord.js";
import Mongoose from "mongoose";
import { Snowflake } from "nodejs-snowflake";
import { tmpdir } from "os";
import path, { join } from "path";
import puppeteer from "puppeteer";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import config from "./config.js";
import AutoUnpunish from "./util/AutoUnpunish.js";
import CleanTickets from "./util/CleanTickets.js";
import { HandleConsoleCommand } from "./util/ConsoleUtils.js";
import Log, { LogType } from "./util/Log.js";
import { Register } from "./util/Register.js";
import ServerStats from "./util/ServerStats.js";
import "./database.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// this is a really bad way of avoiding errors, but it is what it is
process.on("uncaughtException", (error) => {
    Log(`An uncaught exception has occured, ignoring, but may cause issues...\n${error.stack}`, LogType.Warn);
});

process.on("exit", () => {
    browser.close();
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
        "MessageContent",
    ],
    allowedMentions: {
        parse: ["roles", "users"]
    }
});


// ------------------------------------------

const SnowFlake = new Snowflake({ custom_epoch: config.SnowflakeEpoch });
const DeeplTranslator = new deepl.Translator(config.DANGER.DEEPL_KEY);

// Set up puppeteer
const browser = await puppeteer.launch({
    userDataDir: path.join(tmpdir(), "puppeteer"),

    args: [
        ...config.puppeteerArgs
    ]
});

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
    shutdown,
    SnowFlake,
    DeeplTranslator,
    browser
};
export default Ulquiorra;