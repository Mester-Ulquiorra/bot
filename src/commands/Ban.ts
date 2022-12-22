import { GuildMember } from "discord.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { SnowFlake } from "../Ulquiorra.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import ConvertDuration from "../util/ConvertDuration.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import { CanManageUser, CanPerformPunishment, CreateAppealButton, CreateModEmbed } from "../util/ModUtil.js";

const BanCommand: SlashCommand = {
    name: "ban",

    async run(interaction, _client) {
        const target = interaction.options.getMember("member") as GuildMember;
        if (!target) return GetError("MemberUnavailable");

        const reason = interaction.options.getString("reason") ?? "no reason provided";
        const duration = ConvertDuration(interaction.options.getString("duration"));

        // if duration is NaN, we have an error
        if (isNaN(duration)) return GetError("Duration");

        // get the user config for both the interaction and the target user
        const userConfig = await GetUserConfig(interaction.user.id);
        if (!CanPerformPunishment(userConfig, PunishmentType.Ban, duration)) return GetError("InsufficentModLevel");

        const targetConfig = await GetUserConfig(target.id);

        // check if the user can manage the member
        if (!CanManageUser(userConfig, targetConfig) || target.user.bot || !target.bannable) return GetError("BadUser");

        // create a snowflake for the punishment
        const punishmentId = SnowFlake.getUniqueID().toString();

        // create the punishment
        const punishment = await PunishmentConfig.create({
            punishmentId: punishmentId,
            user: target.id,
            mod: interaction.user.id,
            type: PunishmentType.Ban,
            at: Math.floor(Date.now() / 1000),
            // if duration is not -1, set until to current time + duration
            until: duration === -1 ? -1 : Math.floor(Date.now() / 1000) + duration,
            reason,
        });

        Log(`${target.user.tag} (${target.id}) has been banned by ${interaction.user.tag} (${interaction.user.id}): ${reason}. ID: ${punishmentId}`);

        const modEmbed = CreateModEmbed(interaction.user, target.user, punishment);
        const userEmbed = CreateModEmbed(interaction.user, target.user, punishment, { userEmbed: true });
        const channelEmbed = CreateEmbed(`${target.user} has been banned: **${reason}**`);

        target
            .send({ embeds: [userEmbed], components: [CreateAppealButton(true)] })
            .catch(() => { return; })
            .finally(() => {
                target.ban({ reason: `Banned by ${interaction.user.tag}: ${reason}` }).catch(() => { return; });
            });

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });

        GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

        interaction.reply({ embeds: [modEmbed], ephemeral: true });
    }
}

export default BanCommand;