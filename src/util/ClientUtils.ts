import { TextChannel } from "discord.js";
import Ulquiorra from "../Ulquiorra.js";
import config from "../config.js";

type SpecialChannelName = "ModLog" | "MessageLog" | "Welcome" | "LevelUp" | "TestMode" | "Appeal" | "MiscLog" | "Automod";

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

export function GetGuild() {
	return Ulquiorra.guilds.cache.get(config.GuildId);
}
