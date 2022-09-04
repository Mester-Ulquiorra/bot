import { GuildMember } from "discord.js";
import config from "../config";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig";
import SlashCommand from "../types/SlashCommand";
import { SnowFlake } from "../Ulquiorra";
import { GetSpecialChannel } from "../util/ClientUtils";
import { GetUserConfig } from "../util/ConfigHelper";
import ConvertDuration from "../util/ConvertDuration";
import CreateEmbed from "../util/CreateEmbed";
import GetError from "../util/GetError";
import Log from "../util/Log";
import ManageRole from "../util/ManageRole";
import { CanManageUser, CanPerformPunishment, CreateAppealButton, CreateModEmbed } from "../util/ModUtils";

const MuteCommand: SlashCommand = {
    name: "mute",

    async run(interaction, _client) {
        const target = interaction.options.getMember("member") as GuildMember;
        if (!target) return GetError("MemberUnavailable");

        const reason = interaction.options.getString("reason") ?? "no reason provided";
        const duration = ConvertDuration(interaction.options.getString("duration"));
        if (isNaN(duration)) return GetError("Duration");

        const userConfig = await GetUserConfig(interaction.user.id);
        if(!CanPerformPunishment(userConfig, PunishmentType.Mute, duration)) return GetError("NotallowedDuration");
        const targetConfig = await GetUserConfig(target.id);

        if (!CanManageUser(userConfig, targetConfig) || target.user.bot) return GetError("BadUser");

        if (targetConfig.muted && (await ManageRole(target, config.MutedRole, "Check"))) return "Member is already muted";

        const punishmentId = SnowFlake.getUniqueID().toString();

        const punishment = await PunishmentConfig.create({
            id: punishmentId,
            user: target.id,
            mod: interaction.user.id,
            type: PunishmentType.Mute,
            reason,
            at: Math.floor(Date.now() / 1000),
            until: duration === -1 ? -1 : Math.floor(Date.now() / 1000) + duration
        });

        ManageRole(target, config.MutedRole, "Add", `Muted by ${interaction.user.tag}: ${reason}`);

        targetConfig.muted = true;
        await targetConfig.save();

        Log(`${target.user.tag} (${target.id}) has been muted by ${interaction.user.tag} (${interaction.user.id}): ${reason}. ID: ${punishmentId}`);

        const modEmbed = CreateModEmbed(interaction.user, target.user, punishment);
        const userEmbed = CreateModEmbed(interaction.user, target.user, punishment, { userEmbed: true });
        const channelEmbed = CreateEmbed(`${target} has been muted: **${reason}**`);

        target.send({ embeds: [userEmbed], components: [CreateAppealButton()] }).catch(() => { return; });

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });

        GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

        interaction.reply({ embeds: [modEmbed], ephemeral: true });
    }
}

export default MuteCommand;