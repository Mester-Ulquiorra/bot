import UserConfig from "../database/UserConfig.js";
import ConsoleCommand from "../types/ConsoleCommand.js";

const SetModConsoleCommand: ConsoleCommand = {
    name: "setmod",
    help: "setmod <userid> [newmod = 0] - Sets a user's mod level",

    async run(args, _client) {
        // check if args is empty
        if (args.length === 0) {
            console.log("No arguments.");
            return;
        }

        // check if args is longer than 2
        if (args.length > 2) {
            console.log("Too many arguments.");
            return;
        }

        // set userid to first argument
        const userid = args[0];

        // set modlevel to second argument (if it doesn't exist, set it to 0)
        const modlevel = args[1] as number ?? 0;

        // try to get the user config
        const userconfig = await UserConfig.findOne({ id: userid });

        // if it doesn't exist, return
        if (!userconfig) {
            console.log("User not found.");
            return;
        }

        // set the user config's mod level
        userconfig.mod = modlevel;
        await userconfig.save();

        console.log(`[Setmod] Mod level of ${userid} set to ${modlevel}`);
    }
};

export default SetModConsoleCommand;