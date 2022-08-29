import UserConfig from "../database/UserConfig";
import ConsoleCommand from "../types/ConsoleCommand";

const ShowModsConsoleCommand: ConsoleCommand = {
    name: "showmods",
    help: "showmods - shows every moderator",

    async run(_args, client) {
        // get every user with a mod not 0
        const mods = await UserConfig.find({ mod: { $ne: 0 } }).sort({ mod: -1 });

        console.log("----------------------------------------------------");

        // go through every mod
        for (const mod of mods) {
            // try to get the user
            await client.users
                .fetch(mod.id)
                .then((user) => {
                    // format: <user's tag> - (<user's id>) - <mod level>
                    console.log(
                        `[Mod] ${user.tag ?? "Unknown"} - (${mod.id}) - ${mod.mod}`
                    );
                })
                .catch(() => { console.log(`[Mod] Couldn't fetch ${mod.id}`) });
        }

        console.log("----------------------------------------------------");
    }
}

export default ShowModsConsoleCommand;