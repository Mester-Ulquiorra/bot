import { GuildBan } from "discord.js";
import Event from "../types/Event.js";
import { GetUserConfig } from "../util/ConfigHelper.js";

const GuildBanAddEvent: Event = {
	name: "guildBanAdd",
	async run(client, ban: GuildBan) {
		// try to get user config
		const userConfig = await GetUserConfig(ban.user.id, null, false);

		if (!userConfig) return;

		userConfig.banned = true;
		await userConfig.save();
	},
};

export default GuildBanAddEvent;
