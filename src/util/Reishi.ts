import { Message } from "discord.js";
import { InternalMute } from "../commands/Mute.js";
import config from "../config.js";
import testMode from "../testMode.js";
import { GetGuild } from "./ClientUtils.js";
import { GetUserConfig } from "./ConfigHelper.js";
import CheckFlood from "./Reishi/CheckFlood.js";
import CheckLink from "./Reishi/CheckLink.js";
import CheckProtectedPing from "./Reishi/CheckProtectedPing.js";
import CheckSkull from "./Reishi/CheckSkull.js";
import { ChannelIsTicket } from "./TicketUtils.js";
import CheckProfanity from "./Reishi/CheckProfanity.js";

const MassMentionThreshold = 5;

export interface ReishiEvaluation {
    /**
     * Used to determine what was found in the message.
     */
    comment: string;
    /**
     * If the message should not be deleted.
     * @default false
     */
    forceDelete?: boolean;
}

type PunishmentNames = "RepeatedText" | "BlacklistedWord" | "MassMention" | "Link" | "ProtectedPing" | "Insult" | "Language";

/**
 * An array of message IDs that have been punished. Deleted after 10 minutes.
 */
const punishLock = new Array<string>();

/**
 * The main function of Reishi.
 * @param message The message to check.
 * @param client The bot client.
 * @returns If the message is clean.
 */
export async function CheckMessage(message: Message) {
    const start = performance.now();

    // check if the message's author is a bot
    if (message.author.bot) {
        return true;
    }

    // check if the message is actually in a guild
    if (!message.inGuild()) {
        return false;
    }

    // check if the user is a mod
    const userConfig = await GetUserConfig(message.author.id, "checking message");
    if (userConfig.mod > 0 && !testMode) {
        return true;
    }

    // check if the message's channel is an absolute no search channel
    if (config.channels.AbsoluteNoSearch.includes(message.channel.id)) {
        return true;
    }

    // check if we're in a ticket
    if (ChannelIsTicket(message.channel.name)) {
        return true;
    }

    return Promise.all([
        CheckProfanity(message), // disable for now
        CheckFlood(message),
        CheckLink(message),
        CheckProtectedPing(message),
        // CheckInsult(message); // disable for now
        CheckSkull(message),
        new Promise<boolean>((resolve) => {
            if (message.mentions.members?.size >= MassMentionThreshold) {
                PunishMessage(message, "MassMention", { comment: `Pinged more than ${MassMentionThreshold} members` });
                resolve(true);
            } else {
                resolve(false);
            }
        }),
        // check is the message is just an idiotic "hmmm"
        new Promise<boolean>((resolve) => {
            if (RegExp(/^hm+$/i).exec(message.content)) {
                PunishMessage(message, "BlacklistedWord", {
                    comment: "__delete__"
                });
                resolve(true);
            }
            resolve(false);
        })
    ]).then((results) => {
        if (testMode) {
            console.log(`Reishi took ${performance.now() - start}ms to evaluate a message`);
        }

        // check if any of the checks returned true
        if (results.some((result) => result)) {
            return false;
        }
        return true;
    });
}

/**
 * Get the punishment length of a punishment type.
 * @param type The type to get the punishment length of.
 */
export function GetPunishmentLength(type: PunishmentNames) {
    switch (type) {
        case "BlacklistedWord":
            return 30 * 60; // 30 minutes
        case "RepeatedText":
            return 20 * 60; // 20 minutes
        case "MassMention":
            return 2 * 60 * 60 * 24 * 365; // 2 years
        case "Link":
            return 10 * 60; // 10 minutes
        case "ProtectedPing":
            return 30 * 60; // 30 minutes
        default:
            return 30 * 60; // 30 minutes
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
 * @param message The message to punish
 * @param type The punishment type
 * @param result The word that was caught
 */
export async function PunishMessage(message: Message, type: PunishmentNames, result: ReishiEvaluation) {
    // check if the message has already been punished
    if (punishLock.includes(message.id)) {
        return;
    }

    // add the message to the punish lock
    punishLock.push(message.id);

    // remove the message from the punish lock after 10 minutes
    setTimeout(
        () => {
            const index = punishLock.indexOf(message.id);
            if (index !== -1) {
                punishLock.splice(index, 1);
            }
        },
        10 * 60 * 1000
    );

    if (testMode) {
        if (result.comment === "__delete__") {
            message.react("🗑️");
        } else {
            message.react("❌");
        }
        return;
    }

    // delete the message
    if (result.comment === "__delete__") {
        message.delete();
        return;
    }
    if (
        !(type === "RepeatedText" && message.mentions.members?.size !== 0) &&
        (result.forceDelete === undefined || result.forceDelete === true)
    ) {
        message.delete();
    }

    // call the internal mute function
    InternalMute(await GetGuild().members.fetchMe(), message.member, GetPunishmentLength(type), GetPunishmentReason(type), {
        detail: result.comment
    });
}
