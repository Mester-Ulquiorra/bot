import { Message } from "discord.js";

/**
 * the channel ids, where normal links shouldn't be checked (this doesn't include discord invites)
 */
const ExcludeNormalSearch = [
    "841687705989152778", // media
    "1005570504817655930", // bot commands
    "1008039145563750420", // music commands
];

export const DiscordInviteRegExp = /discord(?:app)?\.com\/(?:(friend-)?invite|servers)?\/([a-z0-9-]+)|discord\.gg\/(?:\S+\/)?([a-z0-9-]+)/m;
export const UrlRegExp = /https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b)*(\/[/\d\w.-]*)*(?:[?])*(.+)*/i;

/**
 *
 * @param message The message to check.
 * @returns The link that was found (if none, it's null).
 */
export default function (message: Message) {
    // check if we have a discord invite
    const discordInvite = message.content.match(DiscordInviteRegExp);
    if (discordInvite) return discordInvite[0];

    // check if we're in an excluded channel
    if (ExcludeNormalSearch.includes(message.channelId)) {
        return null;
    }

    return message.content.match(DiscordInviteRegExp)?.[0];
}