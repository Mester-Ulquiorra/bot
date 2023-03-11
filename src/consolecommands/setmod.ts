import { SetModRole } from "../commands/SetMod.js";
import UserConfig from "../database/UserConfig.js";
import ConsoleCommand from "../types/ConsoleCommand.js";
import { GetGuild } from "../util/ClientUtils.js";

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
        const userId = args[0] as string;

        // set modlevel to second argument (if it doesn't exist, set it to 0)
        const modLevel = args[1] as number ?? 0;

        // try to get the user config
        const userConfig = await UserConfig.findOne({ userId });

        // if it doesn't exist, return
        if (!userConfig) {
            console.log("User not found.");
            return;
        }

        // set the user config's mod level
        userConfig.mod = modLevel;
        await userConfig.save();

        GetGuild().members.fetch(userId)
            .then(async member => {
                try {
                    await SetModRole(member, modLevel);
                } catch {
                    console.warn(`[Setmod] Failed to set mod role for ${userId}`);
                }
            })
            .catch(() => {
                console.warn(`[Setmod] Failed to fetch member ${userId}`);
            })
            .finally(() => {
                console.log(`[Setmod] Mod level of ${userId} set to ${modLevel}`);
            });
    }
};

export default SetModConsoleCommand;