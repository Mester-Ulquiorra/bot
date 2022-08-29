import { GetGuild } from "./ClientUtils";
import Log, { LogType } from "./Log";

const MembersChannelId = "811680790370058271";
const BoostChannelId = "979763624916684862";

export default async function() {
    try {
        const guild = GetGuild();

        // get the bots
        const bots = await guild.members.fetch().then((members) => {
            return members.reduce((acc, member) => member.user.bot ? acc + 1 : acc, 0);
        });

        // edit the members channel
        guild.channels.fetch(MembersChannelId).then((channel) => {
            // 3 is the bots on the server
            channel.edit({ name: `Members: ${guild.memberCount - bots}` });
        });

        // edit the boost channel
        guild.channels.fetch(BoostChannelId).then((channel) => {
            channel.edit({ name: `Boosts: ${guild.premiumSubscriptionCount}` });
        });
    } catch(error) {
        Log(`Couldn't refresh server stats: ${error.stack}`, LogType.Warn)
    }
};
