import UserConfig from "../database/UserConfig.js";
import ConsoleCommand from "../types/ConsoleCommand.js";
const ShowModsConsoleCommand: ConsoleCommand = {
    name: "showmods",
    help: "showmods - shows every moderator",

    async run(_args, client) {
        // get every user with a mod not 0
        const mods = await UserConfig.find({ mod: { $ne: 0 } }).sort({ mod: -1 });

        const modFetches: Promise<string>[] = [];

        // go through every mod
        for (const mod of mods) {
            modFetches.push(client.users.fetch(mod.userId)
                .then((user) => {
                    return `[Mod] ${user.tag ?? "Unknown"} - (${mod.userId}) - ${mod.mod}`;
                })
                .catch(() => { return `[Mod] Couldn't fetch ${mod.userId}`; }));
        }

        // wait for all the fetches to finish and then log them
        await Promise.all(modFetches).then((modFetches) => {
            console.log("----------------------------------------------------");
            console.log(modFetches.join("\n"));
            console.log("----------------------------------------------------");
        });
    }
};

export default ShowModsConsoleCommand;