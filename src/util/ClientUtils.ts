import { GuildTextBasedChannel, TextChannel } from "discord.js";
import config from "../config";
import Ulquiorra from "../Ulquiorra";

type SpecialChannelName = "ModLog" | "MessageLog" | "Welcome" | "LevelUp" | "TestMode" | "Appeal";

export const GetSpecialChannel = function(channelName: SpecialChannelName): GuildTextBasedChannel {
	switch(channelName) {
		case "ModLog": return Ulquiorra.channels.cache.get(config.MOD_LOG_CHANNEL) as TextChannel;
		case "MessageLog": return Ulquiorra.channels.cache.get(config.MESSAGE_LOG_CHANNEL) as TextChannel;
		case "Welcome": return Ulquiorra.channels.cache.get(config.WELCOME_CHANNEL) as TextChannel;
		case "LevelUp": return Ulquiorra.channels.cache.get(config.LEVEL_UP_CHANNEL) as TextChannel;
		case "TestMode": return Ulquiorra.channels.cache.get(config.TEST_MODE_CHANNEL) as TextChannel;
		case "Appeal": return Ulquiorra.channels.cache.get(config.APPEAL_CHANNEL) as TextChannel;
	}
}

export const GetGuild = function() {
	return Ulquiorra.guilds.cache.get(config.GUILD_ID);
}