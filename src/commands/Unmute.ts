import { PunishmentType } from "@mester-ulquiorra/commonlib";
import { GuildMember } from "discord.js";
import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import ManageRole from "../util/ManageRole.js";
import { CanManageUser, CanPerformPunishment, CreateModEmbed } from "../util/ModUtils.js";

const UnmuteCommand: SlashCommand = {
	name: "unmute",

	async run(interaction, _client) {
		// get member and reason
		const target = interaction.options.getMember("member") as GuildMember;
		if (!target) return GetError("UserUnavailable");

		const reason = interaction.options.getString("reason") ?? "no reason provided";

		// get user and member config
		const userConfig = await GetUserConfig(interaction.user.id, "unmuting a user");
		if (!CanPerformPunishment(userConfig, PunishmentType.Mute, 259201))
			// only level 3 and higher can unmute
			return GetError("InsufficentModLevel");
		const targetConfig = await GetUserConfig(target.id, "unmute a user");

		// check if user can manage member
		if (!CanManageUser(userConfig, targetConfig) || target.user.bot) return GetError("BadUser");

		// check if member is muted
		if (!targetConfig.muted && !(await ManageRole(target, config.roles.Muted, "Check"))) return "Member is not muted.";

		// get the member's latest active mute punishment
		const targetMutes = await PunishmentConfig.find({
			user: target.id,
			active: true,
			type: PunishmentType.Mute,
		}).sort({ at: -1 });

		// if the punishment is not null, set all of it to inactive
		if (targetMutes) {
			for (const punishment of targetMutes) {
				punishment.active = false;
				await punishment.save();
			}
		}

		// set memberConfig's muted to false
		targetConfig.muted = false;
		await targetConfig.save();

		// remove the muted role
		ManageRole(target, config.roles.Muted, "Remove");

		// log
		logger.log(`${target.user.tag} (${target.id}) has been unmuted by ${interaction.user.tag} (${interaction.user.id}): ${reason}`);

		const modEmbed = CreateModEmbed(interaction.user, target.user, targetMutes[0], {
			anti: true,
			backupType: 1,
			reason,
		});
		const userEmbed = CreateModEmbed(interaction.user, target.user, targetMutes[0], {
			userEmbed: true,
			anti: true,
			backupType: 1,
			reason,
		});
		const channelEmbed = CreateEmbed(`${target.user} has been unmuted: **${reason}**`);

		target.send({ embeds: [userEmbed] }).catch(() => {
			return;
		});

		interaction.channel?.sendTyping().then(() => {
			interaction.channel?.send({ embeds: [channelEmbed] });
		});

		GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

		interaction.reply({ embeds: [modEmbed], ephemeral: true });
	},
};

export default UnmuteCommand;
