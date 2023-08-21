import { TextChannel } from "discord.js";
import Ulquiorra from "../Ulquiorra.js";
import config from "../config.js";
import InviteConfig from "../database/InviteConfig.js";

type SpecialChannelName = "ModLog" | "MessageLog" | "Welcome" | "LevelUp" | "Appeal" | "MiscLog" | "Automod";

export function GetSpecialChannel(channelName: SpecialChannelName) {
	switch (channelName) {
		case "ModLog":
			return Ulquiorra.channels.cache.get(config.channels.ModLog) as TextChannel;
		case "MessageLog":
			return Ulquiorra.channels.cache.get(config.channels.MessageLog) as TextChannel;
		case "Welcome":
			return Ulquiorra.channels.cache.get(config.channels.Welcome) as TextChannel;
		case "LevelUp":
			return Ulquiorra.channels.cache.get(config.channels.LevelUp) as TextChannel;
		case "Appeal":
			return Ulquiorra.channels.cache.get(config.channels.Appeal) as TextChannel;
		case "MiscLog":
			return Ulquiorra.channels.cache.get(config.channels.MiscLog) as TextChannel;
		case "Automod":
			return Ulquiorra.channels.cache.get(config.channels.Automod) as TextChannel;
	}
}

export async function GetTotalInvites(userId: string) {
	const inviteConfig = await InviteConfig.find({ userId });

	if (!inviteConfig) return 0;

	return inviteConfig.reduce((acc, val) => acc + val.uses, 0);
}

export function GetGuild() {
	const guild = Ulquiorra.guilds.cache.get(config.GuildId);
	if(!guild) {
		throw new Error("Guild not found");
	}
	return guild;
}
