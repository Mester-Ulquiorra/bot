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

        const reason = interaction.options.getString("reason") ?? "no reason provided";
        const duration = ConvertDuration(interaction.options.getString("duration"));
        if (isNaN(duration)) return GetError("Duration");

        const punishment = await InternalMute(interaction.member as GuildMember, target, duration, reason);
        if (typeof punishment === "string") return punishment;

        const channelEmbed = CreateEmbed(`${target} has been muted: **${reason}**`);

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });
    }
};

/**
 * The internal function for muting a user
 * @param mod The moderator
 * @param target The target of the mute
 * @param duration The duration of the mute
 * @param reason The reason for the mute
 */
export async function InternalMute(mod: GuildMember, target: GuildMember, duration: number, reason: string, detail: string = undefined) {
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

    Log(`${target.user.tag} (${target.id}) has been muted by ${mod.user.tag} (${mod.user.id}): ${reason}. ID: ${punishmentId}`);

    const modEmbed = CreateModEmbed(mod.user, target.user, punishment, { detail });
    const userEmbed = CreateModEmbed(mod.user, target.user, punishment, { userEmbed: true });

    target.send({ embeds: [userEmbed.embed], components: userEmbed.components }).catch(() => { return; });
    GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

    return punishment;
}

export default MuteCommand;