import { ChannelType, Message } from "discord.js";
import config from "../../config";
import { GetUserConfig } from "../ConfigHelper";

export default async function (message: Message): Promise<string> {
    if(message.channel.type === ChannelType.DM) return;

    // check if the user is a mod or they have the protected role
    const userConfig = await GetUserConfig(message.author.id);
    if(userConfig.mod !== 0 || message.member.roles.cache.has(config.ProtectedRole)) return null;

    // check if the message contains a mention with the protected role
    const protectedPings = [...new Set(
        message.mentions.members
            .map(member => member)
            .filter(member => member.roles.cache.has(config.ProtectedRole))
    )]

    if (protectedPings.length === 0) return null;
    // if there are more than 1 protected users pinged, just mute
    if (protectedPings.length >= 2) return `Pinged the following protected members: ${protectedPings.map(member => member.toString()).join(", ")}`;

    const user = protectedPings[0];

    // check if the user has any fresh messages in the channels
    const now = Date.now();
    const freshMessages = (await message.channel.messages.fetch({ limit: 50 }))
        // messages in the last 2 minutes
        .filter(x => (now - x.createdTimestamp) < 2 * 60 * 1000)
        // filter messages only from the pinged user
        .filter(x => x.author.id === user.id)
        // collection to array
        .map(x => x);

    if(freshMessages.length === 0) return `Pinged the following protected member: ${user}`;

    // ask the user if they want to mute
    const inputMessage = await message.reply({
        content: `${user}, should I mute for this?`,
        allowedMentions: {
            repliedUser: false,
            users: [user.id]
        }
    });

    inputMessage.react("✅");
    inputMessage.react("❌");

    return inputMessage.awaitReactions({
        max: 1,
        filter: (reaction, reactionUser) => reactionUser.id === user.id,
        time: 30_000
    }).then((reactions) => {
        const reaction = reactions.first();
        inputMessage.delete();

        if (reaction.emoji.name === "✅") {
            return `Pinged the following protected member: ${user}`;
        }

        return null;
    }).catch(() => {
        inputMessage.delete();
        return `Pinged the following protected member: ${user}`;
    })
}