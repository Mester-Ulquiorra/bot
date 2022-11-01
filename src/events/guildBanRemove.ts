import { GuildBan } from "discord.js";
import Event from "../types/Event";
import { GetUserConfig } from "../util/ConfigHelper";

const GuildBanRemoveEvent: Event = {
    name: "guildBanRemove",
    async run(client, ban: GuildBan) {
        // try to get user config
        const userConfig = await GetUserConfig(ban.user.id, null, false);

        if(!userConfig) return;

        userConfig.banned = false;
        await userConfig.save();
    },
}

export default GuildBanRemoveEvent;