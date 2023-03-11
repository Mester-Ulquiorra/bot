import { GuildMember, spoiler } from "discord.js";
import config from "../config.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import Event from "../types/Event.js";
import { SnowFlake } from "../Ulquiorra.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import Log from "../util/Log.js";
import ManageRole from "../util/ManageRole.js";
import { CreateModEmbed } from "../util/ModUtils.js";
import { DetectProfanity } from "../util/Reishi/CheckProfanity.js";

const GuildMemberAddEvent: Event = {
    name: "guildMemberAdd",

    async run(client, member: GuildMember) {
        if (member.guild.id === config.PrisonId) return;

        // first of all, check if the member has an inappropriate username
        if (DetectProfanity(member.displayName)) {
            if (!member.kickable) return;

            const punishmentId = SnowFlake.getUniqueID().toString();

            const punishment = await PunishmentConfig.create({
                punishmentId: punishmentId,
                user: member.id,
                mod: client.user.id,
                type: PunishmentType.Kick,
                at: Math.floor(Date.now() / 1000),
                active: false,
                automated: true,
                reason: "member had an inappropriate username"
            });

            const modEmbed = CreateModEmbed(client.user, member.user, punishment, { detail: member.displayName });
            const userEmbed = CreateModEmbed(client.user, member.user, punishment, { userEmbed: true, detail: member.displayName });

            member
                .send({ embeds: [userEmbed.embed] })
                .catch(() => { return; })
                .finally(() => { member.kick("inappropriate username"); });

            Log(`${member.user.tag} (${member.id}) has been automatically kicked: ${punishment.reason}. Punishment ID: ${punishment.punishmentId}`);

            GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

            return;
        }

        // get the member config (doesn't matter if it didn't exist before)
        const memberConfig = await GetUserConfig(member.id, "new member");

        // set the lastjoined field to the current timestamp and inguild to true
        memberConfig.lastjoined = Math.floor(Date.now() / 1000);
        if (memberConfig.firstjoined === -1) memberConfig.firstjoined = memberConfig.lastjoined;
        memberConfig.inguild = true;
        await memberConfig.save();

        // check if the member is muted and if yes, add the role back
        if (memberConfig.muted) ManageRole(member, config.roles.Muted, "Add", "joined back as muted");

        // create the embed
        const embed = CreateEmbed(`**Let's welcome our new member, ${member}!**`)
            .addFields([
                {
                    // field for when the member joined
                    name: `Joined at:`,
                    value: `<t:${memberConfig.lastjoined}>`,
                    inline: true,
                },
            ])
            // set the thumbnail to the member's avatar
            .setThumbnail(member.user.displayAvatarURL())
            // set footer to the member's id
            .setFooter({ text: `ID: ${member.id}` });

        // get the welcome channel and send the embed
        GetSpecialChannel("Welcome").send({ content: spoiler(member.user.toString()), embeds: [embed] });
    }
};

export default GuildMemberAddEvent;