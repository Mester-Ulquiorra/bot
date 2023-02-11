import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import { CanPerformPunishment, CreateModEmbed } from "../util/ModUtils.js";

const UnbanCommand: SlashCommand = {
    name: "unban",

    async run(interaction, _client) {
        // get the member and reason
        const target = interaction.options.getUser("member");
        const reason = interaction.options.getString("reason") ?? "no reason provided";

        const userConfig = await GetUserConfig(interaction.user.id);
        if (userConfig.mod == 0) return GetError("Permission");
        if (!CanPerformPunishment(userConfig, PunishmentType.Ban, 0)) // only head mods and higher can unban
            return GetError("InsufficentModLevel");

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
};

export default UnbanCommand;