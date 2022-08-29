import { Client, Message } from "discord.js";
import config from "../config";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig";
import test_mode from "../test_mode";
import { SnowFlake } from "../Ulquiorra";
import { GetSpecialChannel } from "./ClientUtils";
import { GetUserConfig } from "./ConfigHelper";
import Log from "./Log";
import ManageRole from "./ManageRole";
import { CreateModEmbed } from "./ModUtils";
import CheckFlood from "./Reishi/CheckFlood";
import CheckLink from "./Reishi/CheckLink";
import CheckProfanity from "./Reishi/CheckProfanity";

const MASS_MENTION_THRESHOLD = 5;

/**
 * Array containing channel ids where link detection should be absolutely excluded.
 */
const ABSOLUTE_NO_SEARCH = [
    "992888358789459998", // level 100 chat
];

/**
 * The main function of Reishi.
 * @param message The message to check.
 * @param client The bot client.
 * @returns If the message is fine or not.
 */
export const CheckMessage = async function (message: Message, client: Client): Promise<boolean> {
    // check if message author is a bot
    if (message.author.bot) return true;

    // check if the message's channel is an absolute no search channel
    if (ABSOLUTE_NO_SEARCH.includes(message.channel.id)) return true;

    if (message.channel.isDMBased()) return true;

    // check if we're in a ticket
    if (message.channel.name.startsWith("ticket-")) return true;

    let result = CheckProfanity(message);
    if (result) return PunishMessage(message, "BlacklistedWord", result, client);

    result = CheckFlood(message);
    if (result) return PunishMessage(message, "RepeatedText", result, client);

    result = CheckLink(message);
    if (result) return PunishMessage(message, "Link", result, client);

    if (message.mentions.members?.size >= MASS_MENTION_THRESHOLD)
        return PunishMessage(message, "MassMention", null, client);

    return true;
};

type PunishmentNames = "RepeatedText" | "BlacklistedWord" | "MassMention" | "Link";

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
            return 30 * 60; // 30 minutes
        case "Link":
            return 10 * 60; // 10 minutes
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
    }
}

/**
 * A function to automatically punish a member
 * @param message The message to punish.
 * @param type The punishment type.
 * @param word The word that was caught.
 * @param client The bot client.
 */
async function PunishMessage(message: Message, type: PunishmentNames, word: string, client: Client) {
    // get the user config
    const userconfig = await GetUserConfig(message.author.id);

    // check the mod level
    if (userconfig.mod != 0) {
        // check if we're in test mode
        if (test_mode) message.react("❌");
        return;
    }

    // delete the message
    if (type === "BlacklistedWord" || type === "Link" || (type === "RepeatedText" && message.mentions.members.size === 0)) message.delete();

    // get a punishment id
    const punishmentId = SnowFlake.getUniqueID().toString();

    // create the punishment
    const punishment = await PunishmentConfig.create({
        id: punishmentId,
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
        config.MUTED_ROLE,
        "Add",
        `Muted by Ichigo - ${GetPunishmentReason(type)}`
    );
    userconfig.muted = true;
    await userconfig.save();

    // log
    Log(`User ${message.author.id} (${message.author.tag}) has been automatically muted for "${GetPunishmentReason(type)}". ID: ${punishmentId}`);

    // create the embeds
    const userEmbed = CreateModEmbed(
        client.user,
        message.author,
        punishment,
        { userEmbed: true }
    );

    const modEmbed = CreateModEmbed(
        client.user,
        message.author,
        punishment,
        { detail: word }
    );

    // send the embeds
    message.author.send({ embeds: [userEmbed] }).catch(() => {
        return null;
    });
    GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

    return false;
}