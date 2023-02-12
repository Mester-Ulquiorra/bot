import { GuildTextBasedChannel, TextChannel } from "discord.js";
import config from "../config.js";
import Ulquiorra from "../Ulquiorra.js";

type SpecialChannelName = "ModLog" | "MessageLog" | "Welcome" | "LevelUp" | "TestMode" | "Appeal" | "MiscLog";

export const GetSpecialChannel = function (channelName: SpecialChannelName): GuildTextBasedChannel {
    switch (channelName) {
        case "ModLog": return Ulquiorra.channels.cache.get(config.channels.ModLogChannel) as TextChannel;
        case "MessageLog": return Ulquiorra.channels.cache.get(config.channels.MessageLogChannel) as TextChannel;
        case "Welcome": return Ulquiorra.channels.cache.get(config.channels.WelcomeChannel) as TextChannel;
        case "LevelUp": return Ulquiorra.channels.cache.get(config.channels.LevelUpChannel) as TextChannel;
        case "TestMode": return Ulquiorra.channels.cache.get(config.channels.TestModeChannel) as TextChannel;
        case "Appeal": return Ulquiorra.channels.cache.get(config.channels.AppealChannel) as TextChannel;
        case "MiscLog": return Ulquiorra.channels.cache.get(config.channels.MiscLogChannel) as TextChannel;
    }
};

export const GetGuild = function (prisonServer = false) {
    return prisonServer ? Ulquiorra.guilds.cache.get(config.PrisonId) : Ulquiorra.guilds.cache.get(config.GuildId);
};