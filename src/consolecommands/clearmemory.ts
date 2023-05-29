import ConsoleCommand from "../types/ConsoleCommand.js";
const ClearMemoryConsoleCommand: ConsoleCommand = {
    name: "clearmemory",
    help: "clearmemory - Triggers garbage collection",
    async run(_args, _client) {
        if (global.gc)
            global.gc();
        else
            return console.log("Garbage collector is not exposed");
    }
};

export default ClearMemoryConsoleCommand;