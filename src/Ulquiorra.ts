import { generateDependencyReport } from "@discordjs/voice";
import "canvas";
import * as deepl from "deepl-node";
import { Client } from "discord.js";
import { config as dotconfig } from "dotenv";
import Mongoose from "mongoose";
import { Snowflake } from "nodejs-snowflake";
import { join } from "path";
import { createInterface } from "readline";
import { fileURLToPath, URL } from "url";
import { browser } from "./commands/Rank.js";
import config from "./config.js";
import test_mode from "./testMode.js";
import AutoUnpunish from "./util/AutoUnpunish.js";
import CleanTickets from "./util/CleanTickets.js";
import { HandleConsoleCommand } from "./util/ConsoleUtil.js";
import Log, { LogType } from "./util/Log.js";
import { Register } from "./util/Register.js";
import ServerStats from "./util/ServerStats.js";
console.log(generateDependencyReport())

const __dirname = fileURLToPath(new URL(".", import.meta.url));

dotconfig({
    path: join(__dirname, "..", test_mode ? ".env.test" : ".env")
});

// this is a really bad way of avoiding errors, but it is what it is
process.on("uncaughtException", (error) => {
    Log(`An uncaught exception has occured, ignoring, but may cause issues... ${error.stack}`, LogType.Warn);
});

process.on("exit", () => {
    browser.close();
})

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

Mongoose.connect(`mongodb+srv://discordbot:${process.env.DB_PASS}@${process.env.DB_URL}/discord-database?retryWrites=true&w=majority`).catch((err) => {
    Log("An error has happened while trying to connect to the database, which is a fatal issue. Terminating...", LogType.Fatal);
    Log(err, LogType.Fatal)
    shutdown("MongoDB connection error");
});
// ------------------------------------------

const SnowFlake = new Snowflake({ custom_epoch: config.SnowflakeEpoch });
const DeeplTranslator = new deepl.Translator(process.env.DEEPL_KEY)

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
    DeeplTranslator
};
export default Ulquiorra;