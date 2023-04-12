import { createLogger, format, transports } from "winston";
import { format as formatDate } from "date-fns";
import clc from "cli-color";
import { fileURLToPath } from "url";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const logsFolder = join(__dirname, "..", "..", "logs");

export type LogType = "info" | "warn" | "error" | "fatal";

const dateFormat = "yyyy-MM-dd HH:mm:ss.SSS";

function getColoredType(type: LogType) {
    switch (type) {
        case "info": return clc.blue("INFO");
        case "warn": return clc.xterm(208)("WARN");
        case "error": return clc.xterm(196)("ERROR");
        case "fatal": return clc.xterm(196).bgXterm(160).bold("FATAL");
    }
}

const logFormat = format.printf(({ level, message, timestamp }) => {
    return `[${timestamp} ${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        logFormat
    ),
    transports: [
        new transports.File({
            filename: join(logsFolder, "info.log"),
            level: "info"
        }),
        new transports.File({
            filename: join(logsFolder, "warn.log"),
            level: "warn"
        }),
        new transports.File({
            filename: join(logsFolder, "error.log"),
            level: "error"
        }),
        new transports.File({
            filename: join(logsFolder, "fatal.log"),
            level: "fatal"
        })
    ]
});

/**
 * Logs a message to both the console and the logger.
 * @param {string} message The message to log.
 * @param {LogType} type The type of the message.
 */
export default function (message: string, type: LogType = "info") {
    logger.log({
        level: type,
        message: message
    });
    console.log(`[${formatDate(new Date(), dateFormat)} ${getColoredType(type)}]: ${message}`);
}