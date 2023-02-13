import { GuildTextBasedChannel, TextChannel } from "discord.js";
import config from "../config.js";
import Ulquiorra from "../Ulquiorra.js";

type SpecialChannelName = "ModLog" | "MessageLog" | "Welcome" | "LevelUp" | "TestMode" | "Appeal" | "MiscLog";

export const GetSpecialChannel = function (channelName: SpecialChannelName): GuildTextBasedChannel {
    switch (channelName) {
        case "ModLog": return Ulquiorra.channels.cache.get(config.channels.ModLog) as TextChannel;
        case "MessageLog": return Ulquiorra.channels.cache.get(config.channels.MessageLog) as TextChannel;
        case "Welcome": return Ulquiorra.channels.cache.get(config.channels.Welcome) as TextChannel;
        case "LevelUp": return Ulquiorra.channels.cache.get(config.channels.LevelUp) as TextChannel;
        case "Appeal": return Ulquiorra.channels.cache.get(config.channels.Appeal) as TextChannel;
        case "MiscLog": return Ulquiorra.channels.cache.get(config.channels.MiscLog) as TextChannel;
    }
};

export const GetGuild = function (prisonServer = false) {
    return prisonServer ? Ulquiorra.guilds.cache.get(config.PrisonId) : Ulquiorra.guilds.cache.get(config.GuildId);
};