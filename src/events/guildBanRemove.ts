import { GuildBan } from "discord.js";
import Event from "../types/Event.js";
import { GetUserConfig } from "../util/ConfigHelper.js";

const GuildBanRemoveEvent: Event = {
	name: "guildBanRemove",
	async run(client, ban: GuildBan) {
		// try to get user config
		const userConfig = await GetUserConfig(ban.user.id, "marking user as unbanned");

		userConfig.banned = false;
		await userConfig.save();
	},
};

export default GuildBanRemoveEvent;
