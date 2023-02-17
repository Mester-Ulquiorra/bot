import { createLogger, format, transports } from "winston";
import { format as formatDate } from "date-fns";
import clc from "cli-color";

export enum LogType {
    Info = "info",
    Warn = "warn",
    Error = "error",
    Fatal = "fatal"
}

const dateFormat = "yyyy-MM-dd HH:mm:ss.SSS";

function getColoredType(type: LogType) {
    switch (type) {
        case LogType.Info: return clc.blue("INFO");
        case LogType.Warn: return clc.xterm(208)("WARN");
        case LogType.Error: return clc.xterm(196)("ERROR");
        case LogType.Fatal: return clc.xterm(196).bgXterm(160).bold("FATAL");
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
            filename: "logs/info.log",
            level: LogType.Info
        }),
        new transports.File({
            filename: "logs/warn.log",
            level: LogType.Warn
        }),
        new transports.File({
            filename: "logs/error.log",
            level: LogType.Error
        }),
        new transports.File({
            filename: "logs/fatal.log",
            level: LogType.Fatal
        })
    ]
});

/**
 * Logs a message to both the console and the logger.
 * @param {string} message The message to log.
 * @param {LogType} type The type of the message.
 */
export default function (message: string, type: LogType = LogType.Info) {
    logger.log({
        level: type,
        message: message
    });
    console.log(`[${formatDate(new Date(), dateFormat)} ${getColoredType(type)}]: ${message}`);
}