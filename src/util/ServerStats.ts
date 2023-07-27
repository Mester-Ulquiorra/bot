import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import { GetGuild } from "./ClientUtils.js";

export default async function () {
	try {
		const guild = GetGuild();

		// get the bots
		const bots = 1;

		// edit the members channel
		guild.channels.fetch(config.channels.Members).then((channel) => {
			channel.edit({ name: `Members: ${guild.memberCount - bots}` });
		});

		// edit the boost channel
		guild.channels.fetch(config.channels.Boosts).then((channel) => {
			channel.edit({ name: `Boosts: ${guild.premiumSubscriptionCount}` });
		});
	} catch (error) {
		logger.log(`Couldn't refresh server stats: ${error.stack}`, "warn");
	}
}
