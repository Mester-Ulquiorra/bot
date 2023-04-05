import { Message } from "discord.js";
import config from "../../config.js";
import { GetUserConfig } from "../ConfigHelper.js";

enum ProtectionDecision {
    Yes = "yes",
    No = "no"
}

interface ProtectionMemory {
    userId: string;
    decision: ProtectionDecision;
    time: number;
}

/**
 * A cache for storing protection decisions of users
 */
const protectionCache = new Map<string, ProtectionMemory>();

export default async function (message: Message<true>) {
    // check if the user is a mod or they have the protected role
    const userConfig = await GetUserConfig(message.author.id);
    if (userConfig.mod !== 0 || message.member.roles.cache.has(config.roles.Protected)) return null;

    // check if the message contains a mention with the protected role
    const protectedPings = [...new Set(
        message.mentions.members
            .map(member => member)
            .filter(member => member.roles.cache.has(config.roles.Protected))
    )];

    if (protectedPings.length === 0) return null;
    // if there are more than 1 protected users pinged, just mute
    if (protectedPings.length >= 2) return `Pinged the following protected members: ${protectedPings.map(member => member.toString()).join(", ")}`;

    const now = Date.now();

    const user = protectedPings[0];

    // check if the user has any fresh messages in the channels
    const freshMessages = (await message.channel.messages.fetch({ limit: 50 }))
        // messages in the last 2 minutes
        .filter(x => (now - x.createdTimestamp) < 2 * 60 * 1000)
        // filter messages only from the pinged user
        .filter(x => x.author.id === user.id)
        // collection to array
        .map(x => x);

    if (freshMessages.length === 0) return `Pinged the following protected member: ${user}`;

    let protDecision = protectionCache.get(user.id);

    // validate decision
    if (protDecision && (now - protDecision.time) > 2 * 60 * 1000) {
        protectionCache.delete(user.id);
        protDecision = null;
    }

    if (protDecision && protDecision.decision === ProtectionDecision.Yes) return `Pinged the following protected member: ${user}`;
    else if (protDecision) return null;

    // ask the user if they want to mute
    const inputMessage = await message.reply({
        content: `${user}, should I mute for this?`,
        allowedMentions: {
            repliedUser: false,
            users: [user.id]
        }
    });

    inputMessage.react("✅").then(() => { inputMessage.react("❌"); });

    return inputMessage.awaitReactions({
        max: 1,
        filter: (reaction, reactionUser) => reactionUser.id === user.id,
        time: 30_000
    }).then((reactions) => {
        const reaction = reactions.first();

        if (reaction.emoji.name === "✅") {
            protectionCache.set(user.id, {
                decision: ProtectionDecision.Yes,
                time: Date.now(),
                userId: user.id
            });
            return `Pinged the following protected member: ${user}`;
        }

        protectionCache.set(user.id, {
            decision: ProtectionDecision.No,
            time: Date.now(),
            userId: user.id
        });
        return null;
    }).catch(() => {
        return `Pinged the following protected member: ${user}`;
    }).finally(() => {
        inputMessage.delete();
    });
}