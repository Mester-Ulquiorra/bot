import { GuildMember } from "discord.js";
import Event from "../types/Event";
import { GetSpecialChannel } from "../util/ClientUtils";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed from "../util/CreateEmbed";

const GuildMemberRemoveEvent: Event = {
    name: "guildMemberRemove",

    async run(_client, member: GuildMember) {
        // get member config
        const memberConfig = await GetUserConfig(member.id, "new member, leaving");

        // set inguild to false and mod to 0
        memberConfig.inguild = false;
        memberConfig.mod = 0;
        await memberConfig.save();

        // create the embed
        const embed = CreateEmbed(`**${member} has sadly left us today 😢**`)
            .addFields([
                {
                    name: `Left at`,
                    // set it to current time
                    value: `<t:${Math.floor(Date.now() / 1000)}>`,
                    inline: true,
                },
            ])
            // set thumbnail to member's avatar
            .setThumbnail(member.user.displayAvatarURL())
            // set footer to member's id
            .setFooter({ text: `ID: ${member.id}` });

        // get the welcome channel and send the embed
        GetSpecialChannel("Welcome").send({ embeds: [embed] });
    }
};

export default GuildMemberRemoveEvent;