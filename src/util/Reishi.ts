import { Client, Message } from "discord.js";
import { InternalMute } from "../commands/Mute.js";
import config from "../config.js";
import testMode from "../testMode.js";
import { GetGuild } from "./ClientUtils.js";
import { GetUserConfig } from "./ConfigHelper.js";
import CheckFlood from "./Reishi/CheckFlood.js";
import CheckInsult from "./Reishi/CheckInsult.js";
import CheckLink from "./Reishi/CheckLink.js";
import CheckProfanity from "./Reishi/CheckProfanity.js";
import CheckProtectedPing from "./Reishi/CheckProtectedPing.js";
import { ChannelIsTicket } from "./TicketUtils.js";

const MassMentionThreshold = 5;

/**
 * The main function of Reishi.
 * @param message The message to check.
 * @param client The bot client.
 * @returns If the message is clean.
 */
export const CheckMessage = async function (message: Message, client: Client): Promise<boolean> {
    // check if message author is a bot
    if (message.author.bot) return true;

    // check if the message's channel is an absolute no search channel
    if (config.channels.AbsoluteNoSearch.includes(message.channel.id)) return true;

    if (message.channel.isDMBased()) return true;

    // check if we're in a ticket
    if (ChannelIsTicket(message.channel.name)) return true;

    let result = CheckProfanity(message);
    if (result) return PunishMessage(message, "BlacklistedWord", result, client);

    result = CheckFlood(message);
    if (result) return PunishMessage(message, "RepeatedText", result, client);

    result = CheckLink(message);
    if (result) return PunishMessage(message, "Link", result, client);

    if (message.mentions.members?.size >= MassMentionThreshold)
        return PunishMessage(message, "MassMention", null, client);

    result = await CheckProtectedPing(message);
    if (result) return PunishMessage(message, "ProtectedPing", result, client);

    result = await CheckInsult(message);
    if (result) return PunishMessage(message, "Insult", result, client);

    return true;
};

type PunishmentNames = "RepeatedText" | "BlacklistedWord" | "MassMention" | "Link" | "ProtectedPing" | "Insult";

/**
 * Get the punishment length of a punishment type.
 * @param type The type to get the punishment length of.
 */
export function GetPunishmentLength(type: PunishmentNames) {
    switch (type) {
        case "BlacklistedWord":
            return 30 * 60; // 30 minutes
        case "RepeatedText":
            return 5 * 60; // 5 minutes
        case "MassMention":
            return 60 * 60; // 1 hour
        case "Link":
            return 10 * 60; // 10 minutes
        case "ProtectedPing":
            return 30 * 60; // 30 minutes
        default:
            return 30 * 60;
    }
}

/**
 * Get the reason of a punishment type.
 * @param type The type to get the reason of.
 */
export function GetPunishmentReason(type: PunishmentNames) {
    switch (type) {
        case "BlacklistedWord":
            return "Message contains a blacklisted word";
        case "RepeatedText":
            return "Message contains repeated text";
        case "MassMention":
            return "Message contains mass mention";
        case "Link":
            return "Message contains a link";
        case "ProtectedPing":
            return "Pinging protected member(s)";
        case "Insult":
            return "Message flagged by automod";
        default:
            return "Default autopunish message";
    }
}

/**
 * A function to automatically punish a member
 * @param message The message to punish.
 * @param type The punishment type.
 * @param word The word that was caught.
 * @param client The bot client.
 * @returns If the message was punished or not.
 */
async function PunishMessage(message: Message, type: PunishmentNames, word: string, client: Client): Promise<boolean> {
    if (testMode) {
        if (word === "__delete__") message.react("🗑️");
        else message.react("❌");
        return false;
    }

    // get the user config
    const userConfig = await GetUserConfig(message.author.id);

    if (userConfig.mod > 0) return false;

    // delete the message
    if (word === "__delete__") {
        message.delete();
        return false;
    }
    if (!(type === "RepeatedText" && message.mentions.members.size !== 0)) message.delete();

    // call the internal mute function
    InternalMute(await GetGuild().members.fetchMe(), message.member, GetPunishmentLength(type), GetPunishmentReason(type), word);

    return true;
}