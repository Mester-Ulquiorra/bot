import { Client } from "discord.js";
import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import Event from "../types/Event.js";
import AutoUnpunish from "../util/AutoUnpunish.js";
import ServerStats from "../util/ServerStats.js";

const ReadyEvent: Event = {
	name: "ready",

	async run(client: Client) {
		// fetch the guild and its channels (make sure than fetchMe is blocking, because it's important)
		await client.guilds.fetch(config.GuildId).then(async (guild) => {
			await guild.members.fetchMe();
			guild.channels.fetch();
		});

		AutoUnpunish();
		ServerStats();

		logger.log(`Successfully logged in as ${client.user.tag}!`);
		console.timeEnd("Boot");
	},
};

export default ReadyEvent;
