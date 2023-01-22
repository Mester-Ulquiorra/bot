import { Message } from "discord.js";

/**
 * the channel ids, where normal links shouldn't be checked (this doesn't include discord invites, etc.)
 */
const ExcludeNormalSearch = [
    "841687705989152778", // media
    "1005570504817655930", // bot commands
    "1008039145563750420", // music commands
];

const DiscordInviteRegexp = /(w{3}\.)?(discord\.com\/invite\/|discord\.gg\/)(.+)/gi;

const UrlRegexp = /([a-zA-Z]{2,20}):\/\/([\w_-]+(?:(?:\.[\w_-]+)?))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/igm; //idk how to do this

/**
 *
 * @param message The message to check.
 * @returns The link that was found (if none, it's null).
 */
export default function (message: Message) {
    // check if we have a discord invite
    if (message.content.match(DiscordInviteRegexp)?.length >= 1) return null;

    // check if we're in an excluded channel
    if (ExcludeNormalSearch.includes(message.channelId)) {
        return null;
    }

    // try to find a link and return it (either null or the link)
    return message.content.match(UrlRegexp)?.[0];
}
