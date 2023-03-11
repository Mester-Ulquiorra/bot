import { Client, Message } from "discord.js";
import config from "../config.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import testMode from "../testMode.js";
import { DBPunishment } from "../types/Database.js";
import { SnowFlake } from "../Ulquiorra.js";
import { GetSpecialChannel } from "./ClientUtils.js";
import { GetUserConfig } from "./ConfigHelper.js";
import Log from "./Log.js";
import ManageRole from "./ManageRole.js";
import { CreateModEmbed } from "./ModUtils.js";
import CheckFlood from "./Reishi/CheckFlood.js";
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

    return true;
};

type PunishmentNames = "RepeatedText" | "BlacklistedWord" | "MassMention" | "Link" | "ProtectedPing";

/**
 *
 * @param type The type to get the punishment length of.
 */
function GetPunishmentLength(type: PunishmentNames) {
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
 *
 * @param type The type to get the reason of.
 */
function GetPunishmentReason(type: PunishmentNames) {
    switch (type) {
        case "BlacklistedWord":
            return "Message containing blacklisted word";
        case "RepeatedText":
            return "Message containing repeated text";
        case "MassMention":
            return "Message containing mass mention";
        case "Link":
            return "Message containing link";
        case "ProtectedPing":
            return "Pinging protected member(s)";
        default:
            return "Default autopunish message (most likely an error)";
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

    // get a punishment id
    const punishmentId = SnowFlake.getUniqueID().toString();

    // create the punishment
    const punishment = await PunishmentConfig.create({
        punishmentId: punishmentId,
        user: message.author.id,
        mod: client.user.id,
        type: PunishmentType.Mute,
        reason: GetPunishmentReason(type),
        at: Math.floor(Date.now() / 1000),
        until: Math.floor(Date.now() / 1000) + GetPunishmentLength(type),
        automated: true,
    });

    // give the user the muted role, + save their config
    ManageRole(
        message.member,
        config.roles.Muted,
        "Add",
        `Muted by Ulquiorra - ${GetPunishmentReason(type)}`
    );
    userConfig.muted = true;
    await userConfig.save();

    // log
    Log(`User ${message.author.id} (${message.author.tag}) has been automatically muted for "${GetPunishmentReason(type)}". ID: ${punishmentId}`);

    const punishmentObject = punishment.toObject() as DBPunishment;

    // create the embeds
    const userEmbed = CreateModEmbed(
        client.user,
        message.author,
        punishmentObject,
        { userEmbed: true }
    );

    const modEmbed = CreateModEmbed(
        client.user,
        message.author,
        punishmentObject,
        { detail: word }
    );

    // send the embeds
    message.author.send({ embeds: [userEmbed.embed], components: userEmbed.components }).catch(() => {
        return null;
    });
    GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

    return true;
}