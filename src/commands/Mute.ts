import { PunishmentType } from "@mester-ulquiorra/commonlib";
import { GuildMember } from "discord.js";
import { SnowFlake, logger } from "../Ulquiorra.js";
import config from "../config.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import ConvertDuration from "../util/ConvertDuration.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import ManageRole from "../util/ManageRole.js";
import { CanManageUser, CanPerformPunishment, CreateModEmbed } from "../util/ModUtils.js";
const MuteCommand: SlashCommand = {
    name: "mute",

    async run(interaction, _client) {
        const target = interaction.options.getMember("member") as GuildMember;
        const reason = interaction.options.getString("reason") ?? "no reason provided";
        const duration = ConvertDuration(interaction.options.getString("duration"));
        if (isNaN(duration)) return GetError("Duration");

        const punishment = await InternalMute(interaction.member as GuildMember, target, duration, reason);
        if (typeof punishment === "string") return punishment;

        const channelEmbed = CreateEmbed(`${target} has been muted: **${reason}**`);
        const replyEmbed = CreateModEmbed(interaction.user, target.user, punishment);

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });

        interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    }
};

interface AdvancedMuteOptions {
    /**
     * Extra details of the mute, used by automod to show what triggered the mute
     */
    detail?: string;
    /**
     * Only used for AI automod, contains a custom request ID used for identifying the chat completion session
     */
    requestID?: string;
}

/**
 * The internal function for muting a user
 * @param mod The moderator
 * @param target The target of the mute
 * @param duration The duration of the mute
 * @param reason The reason of the mute
 */
export async function InternalMute(mod: GuildMember, target: GuildMember, duration: number, reason: string, options: AdvancedMuteOptions = {}) {
    if (!target) return GetError("UserUnavailable");

    const userConfig = await GetUserConfig(mod.user.id);
    const targetConfig = await GetUserConfig(target.id);

    if (!CanPerformPunishment(userConfig, PunishmentType.Mute, duration)) return GetError("InsufficentModLevel");
    if (!CanManageUser(userConfig, targetConfig) || target.user.bot) return GetError("BadUser");

    if (targetConfig.muted && (await ManageRole(target, config.roles.Muted, "Check"))) return "Member is already muted";

    const punishmentId = SnowFlake.getUniqueID().toString();

    const punishment = await PunishmentConfig.create({
        punishmentId,
        user: target.id,
        mod: mod.user.id,
        type: PunishmentType.Mute,
        reason,
        at: Math.floor(Date.now() / 1000),
        until: duration === -1 ? -1 : Math.floor(Date.now() / 1000) + duration,
        automated: mod.user.bot
    });

    ManageRole(target, config.roles.Muted, "Add", `Muted by ${mod.user.tag}: ${reason}`);

    targetConfig.muted = true;
    await targetConfig.save();

    logger.log(`${target.user.tag} (${target.id}) has been muted by ${mod.user.tag} (${mod.user.id}): ${reason}. ID: ${punishmentId}`);

    const modEmbed = CreateModEmbed(mod.user, target.user, punishment, { detail: options.detail });
    const userEmbed = CreateModEmbed(mod.user, target.user, punishment, { userEmbed: true, requestID: options.requestID });

    target.send({ embeds: [userEmbed.embed], components: userEmbed.components }).catch(() => { return; });
    GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

    return punishment;
}

export default MuteCommand;