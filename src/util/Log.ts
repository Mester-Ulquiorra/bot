import { format } from "date-fns";
import clc from "cli-color";

const dateFormat = "yyyy-MM-dd HH:mm:ss.SSS";

export enum LogType {
    Info = 0,
    Warn = 1,
    Error = 2,
    Fatal = 3
}

function getColoredType(type: LogType) {
    switch (type) {
        case LogType.Info: return clc.blue("INFO");
        case LogType.Warn: return clc.xterm(208)("WARN");
        case LogType.Error: return clc.xterm(196)("ERROR");
        case LogType.Fatal: return clc.xterm(196).bgXterm(160).bold("FATAL");
    }
}

export default function (message: string, type: LogType = LogType.Info) {
    console.log(["[", format(new Date(), dateFormat), ` ${getColoredType(type)}]: ${message}`].join(""));
}