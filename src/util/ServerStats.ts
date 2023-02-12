import config from "../config.js";
import { GetGuild } from "./ClientUtils.js";
import Log, { LogType } from "./Log.js";

export default async function () {
    try {
        const guild = GetGuild();

        // get the bots
        const bots = 1;

        // edit the members channel
        guild.channels.fetch(config.channels.MembersChannel).then((channel) => {
            channel.edit({ name: `Members: ${guild.memberCount - bots}` });
        });

        // edit the boost channel
        guild.channels.fetch(config.channels.BoostChannel).then((channel) => {
            channel.edit({ name: `Boosts: ${guild.premiumSubscriptionCount}` });
        });
    } catch (error) {
        Log(`Couldn't refresh server stats: ${error.stack}`, LogType.Warn);
    }
}
