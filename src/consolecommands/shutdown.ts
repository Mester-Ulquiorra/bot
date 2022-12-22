import ConsoleCommand from "../types/ConsoleCommand.js";
import { shutdown } from "../Ulquiorra.js";

const ShutdownConsoleCommand: ConsoleCommand = {
    name: "shutdown",
    help: "shutdown <YES> - Shutdown the client",
    async run(args, _client) {
        if(args.length === 0 || args[0] !== "YES") 
            return console.log("You must say YES as a first argument");
        
        shutdown("Shutdown inititated by Console");
    }
}

export default ShutdownConsoleCommand;