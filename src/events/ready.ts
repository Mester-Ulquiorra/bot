import { Client } from "discord.js";
import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import Event from "../types/Event.js";
import AutoUnpunish from "../util/AutoUnpunish.js";
import ServerStats from "../util/ServerStats.js";
import { GetGuild } from "../util/ClientUtils.js";
import { invites } from "./guildMemberAdd.js";
import { joinVoiceChannel } from "@discordjs/voice";
import { AddXPToUser, GetLevelConfig } from "../util/LevelUtils.js";

const ReadyEvent: Event = {
	name: "ready",

	async run(client: Client) {
		// fetch the guild and its channels (make sure that fetchMe is blocking, because it's important)
		await Promise.all([client.guilds.fetch(config.GuildId), GetGuild().members.fetchMe(), GetGuild().channels.fetch()]);

		AutoUnpunish();
		ServerStats();

		// fetch the invites
		GetGuild()
			.invites.fetch()
			.then((guildInvites) => {
				for (const guildInvite of guildInvites.map((i) => i)) {
					invites.set(guildInvite.code, guildInvite.uses ?? 0);
				}
			});

		setupVoiceXp();

		logger.log(`Successfully logged in as ${client.user?.tag}!`);
		console.timeEnd("Boot");
	},
};

const voiceTimes = new Map<string, number>();

function setupVoiceXp() {
	const connection = joinVoiceChannel({
		channelId: config.channels.GeneralVC,
		guildId: GetGuild().id,
		adapterCreator: GetGuild().voiceAdapterCreator,
	});

	connection.receiver.speaking.on("start", (userId) => {
		// store current time in ms
		voiceTimes.set(userId, Date.now());
	});

	connection.receiver.speaking.on("end", async (userId) => {
		const voiceTime = voiceTimes.get(userId);
		if (!voiceTime) return;

		const total = Date.now() - voiceTime;
		const xp = total * 0.0005;

		voiceTimes.delete(userId);

		const levelConfig = await GetLevelConfig(userId);
		const member = await GetGuild().members.fetch(userId);

		AddXPToUser(levelConfig, xp, null, member);
	});
}

export default ReadyEvent;
