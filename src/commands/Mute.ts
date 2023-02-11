import { GuildMember } from "discord.js";
import config from "../config.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { SnowFlake } from "../Ulquiorra.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import ConvertDuration from "../util/ConvertDuration.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import ManageRole from "../util/ManageRole.js";
import { CanManageUser, CanPerformPunishment, CreateModEmbed } from "../util/ModUtils.js";

const MuteCommand: SlashCommand = {
    name: "mute",

    async run(interaction, _client) {
        const target = interaction.options.getMember("member") as GuildMember;
        if (!target) return GetError("UserUnavailable");

        const reason = interaction.options.getString("reason") ?? "no reason provided";
        const duration = ConvertDuration(interaction.options.getString("duration"));
        if (isNaN(duration)) return GetError("Duration");

        const userConfig = await GetUserConfig(interaction.user.id);
        if (!CanPerformPunishment(userConfig, PunishmentType.Mute, duration)) return GetError("InsufficentModLevel");
        const targetConfig = await GetUserConfig(target.id);

        if (!CanManageUser(userConfig, targetConfig) || target.user.bot) return GetError("BadUser");

        if (targetConfig.muted && (await ManageRole(target, config.MutedRole, "Check"))) return "Member is already muted";

        const punishmentId = SnowFlake.getUniqueID().toString();

        const punishment = await PunishmentConfig.create({
            punishmentId,
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

        target.send({ embeds: [userEmbed.embed], components: userEmbed.components }).catch(() => { return; });

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });

        GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

        interaction.reply({ embeds: [modEmbed], ephemeral: true });
    }
};

export default MuteCommand;