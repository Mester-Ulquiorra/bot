import { GuildTextBasedChannel, TextChannel } from "discord.js";
import config from "../config";
import Ulquiorra from "../Ulquiorra";

type SpecialChannelName = "ModLog" | "MessageLog" | "Welcome" | "LevelUp" | "TestMode" | "Appeal" | "MiscLog";

export const GetSpecialChannel = function(channelName: SpecialChannelName): GuildTextBasedChannel {
	switch(channelName) {
		case "ModLog": return Ulquiorra.channels.cache.get(config.ModLogChannel) as TextChannel;
		case "MessageLog": return Ulquiorra.channels.cache.get(config.MessageLogChannel) as TextChannel;
		case "Welcome": return Ulquiorra.channels.cache.get(config.WelcomeChannel) as TextChannel;
		case "LevelUp": return Ulquiorra.channels.cache.get(config.LevelUpChannel) as TextChannel;
		case "TestMode": return Ulquiorra.channels.cache.get(config.TestModeChannel) as TextChannel;
		case "Appeal": return Ulquiorra.channels.cache.get(config.AppealChannel) as TextChannel;
		case "MiscLog": return Ulquiorra.channels.cache.get(config.MiscLogChannel) as TextChannel;
	}
}

export const GetGuild = function(prisonServer = false) {
	return prisonServer ? Ulquiorra.guilds.cache.get(config.PrisonId) : Ulquiorra.guilds.cache.get(config.GuildId);
}