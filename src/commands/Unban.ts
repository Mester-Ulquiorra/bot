import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig";
import SlashCommand from "../types/SlashCommand";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed from "../util/CreateEmbed";
import GetError from "../util/GetError";
import Log from "../util/Log";
import { CreateModEmbed } from "../util/ModUtils";

const UnbanCommand: SlashCommand = {
    name: "unban",

    async run(interaction, _client) {
        // get the member and reason
        const target = interaction.options.getUser("member");
        const reason = interaction.options.getString("reason") ?? "no reason provided";

        const userConfig = await GetUserConfig(interaction.user.id);
        if(userConfig.mod == 0) return GetError("Permission");

        const targetConfig = await GetUserConfig(target.id);

        // check if member is banned by fetching their ban and seeing if it returns an error
        const ban = await GetGuild().bans
            .fetch(target)
            .catch(() => { return "The member is not banned."; });

        // check if the ban object is a string (the member is not banned)
        if (typeof ban === "string") return ban;

        // get the ban punishment of the member by searching for the latest ban punishment that's still active
        const punishment = await PunishmentConfig.findOne({
            user: target.id,
            type: PunishmentType.Ban,
            active: true,
        });

        // unban the member
        const member = await GetGuild().members
            .unban(target, `Unbanned by ${interaction.user.tag}: ${reason}`)
            .catch(() => { return; });

        // if member is null, we got an error
        if (!member) return "Something has went wrong while trying to unban the member.";

        // change memberConfig and the punishment (if it's not null) to inactive
        targetConfig.banned = false;
        await targetConfig.save();

        if (punishment) {
            punishment.active = false;
            await punishment.save();
        }

        Log(`${member.tag} (${member.id}) has been unbanned by ${interaction.user.tag} (${interaction.user.id}): ${reason}`);

        const modEmbed = CreateModEmbed(interaction.user, member, punishment,
            {
                anti: true,
                backupType: PunishmentType.Ban,
                reason,
            }
        );

        const channelEmbed = CreateEmbed(`${member} has been unbanned: **${reason}**`);

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });

        GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

        interaction.reply({ embeds: [modEmbed], ephemeral: true });
    }
}

export default UnbanCommand;