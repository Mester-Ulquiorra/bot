import { Events, GuildBan } from "discord.js";
import Event from "../types/Event.js";
import { GetUserConfig } from "../util/ConfigHelper.js";

const GuildBanAddEvent: Event = {
    name: Events.GuildBanAdd,
    async run(_, ban: GuildBan) {
        // try to get user config
        const userConfig = await GetUserConfig(ban.user.id, "marking user as banned");

        userConfig.banned = true;
        await userConfig.save();
    }
};

export default GuildBanAddEvent;
