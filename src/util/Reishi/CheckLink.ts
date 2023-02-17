import { Message } from "discord.js";
import config from "../../config.js";

export const DiscordInviteRegExp = /discord(?:app)?\.com\/(?:(friend-)?invite|servers)?\/([a-z0-9-]+)|discord\.gg\/(?:\S+\/)?([a-z0-9-]+)/;
export const UrlRegExp = /https?:\/\/(?:www\.)?([\w@:%.+~#=]{2,256}\.[a-z]{2,6}\b)*(\/[/\w.-]*)*(?:[?])*(.+)*/i;
export const DiscordLink = /^https?:\/\/(?:www\.)?(?:(media|canary|ptb|cdn)\.?)(discord(?:app)?\.com|)(?:\/.*|\/?)$/;

/**
 *
 * @param message The message to check.
 * @returns The link that was found (if none, it's null).
 */
export default function (message: Message) {
    // check if we have a discord link
    if (DiscordLink.test(message.content)) return "__delete__";

    // check if we have a discord invite
    const discordInvite = message.content.match(DiscordInviteRegExp);
    if (discordInvite) return discordInvite[0];

    // check if we're in an excluded channel
    if (config.channels.ExcludeNormalSearch.includes(message.channelId)) {
        return null;
    }

    return DetectLink(message.content);
}

/**
 * Internal function for detecting links
 * @param string The string to detect links in
 */
export function DetectLink(string: string) {
    // try to find a link and return it (either null or the link)
    return string.match(DiscordInviteRegExp)?.[0] || string.match(UrlRegExp)?.[0];
}