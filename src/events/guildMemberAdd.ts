import { Client, Collection, GuildMember } from "discord.js";
import config from "../config.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import ManageRole from "../util/ManageRole.js";
import InviteConfig from "../database/InviteConfig.js";

export const invites = new Collection<string, number>();

const GuildMemberAddEvent: Event = {
    name: "guildMemberAdd",

    async run(client, member: GuildMember) {
        // get the member config (doesn't matter if it didn't exist before)
        const memberConfig = await GetUserConfig(member.id, "new member");

        // set the lastjoined field to the current timestamp and inguild to true
        memberConfig.lastjoined = Math.floor(Date.now() / 1000);
        if (memberConfig.firstjoined === -1) {
            memberConfig.firstjoined = memberConfig.lastjoined;
        }
        memberConfig.inguild = true;
        await memberConfig.save();

        // check if the member is muted and if yes, add the role back
        if (memberConfig.muted) {
            ManageRole(member, config.roles.Muted, "Add", "joined back as muted");
        }

        // add the member role
        ManageRole(member, config.roles.Member, "Add", "new member");

        // create the embed
        const embed = CreateEmbed(null)
            .addFields([
                {
                    // field for when the member joined
                    name: `Joined at:`,
                    value: `<t:${memberConfig.lastjoined}>`,
                    inline: true
                }
            ])
            // set the thumbnail to the member's avatar
            .setThumbnail(member.user.displayAvatarURL())
            // set footer to the member's id
            .setFooter({ text: `ID: ${member.id}` });

        // get the welcome channel and send the embed
        GetSpecialChannel("Welcome").send({
            content: `${member.user}, welcome to ${member.guild.name}, we hope you'll have a great time here!`,
            embeds: [embed]
        });

        manageInvite(client, member);
    }
};

async function manageInvite(client: Client, member: GuildMember) {
    // manage the invite
    const newInvites = await member.guild.invites.fetch();

    // find the invite that was used to join the server
    const invite = newInvites.find((i) => (i.uses ?? 0) > (invites.get(i.code) ?? 0));
    if (!invite || !invite.uses || !invite.inviterId) {
        return;
    }

    invites.set(invite.code, invite.uses);
    const inviter = await client.users.fetch(invite.inviterId);

    // update the invite
    InviteConfig.findOneAndUpdate({ code: invite.code, userId: inviter.id }, { $inc: { uses: 1 } }, { upsert: true, new: true }).then(
        (doc) => {
            const embed = CreateEmbed(`${member.user} invited by ${inviter}.`).setThumbnail(member.user.displayAvatarURL()).addFields(
                {
                    name: "Invite Code",
                    value: invite.code,
                    inline: true
                },
                {
                    name: "Uses",
                    value: doc.uses.toString(),
                    inline: true
                }
            );
            GetSpecialChannel("MiscLog").send({ embeds: [embed] });
        }
    );

    const userConfig = await GetUserConfig(member.id, "adding invite code");
    userConfig.joinedWith = invite.code;
    await userConfig.save();
}

export default GuildMemberAddEvent;
