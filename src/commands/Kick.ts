import { PunishmentType } from "@mester-ulquiorra/commonlib";
import { GuildMember } from "discord.js";
import { SnowFlake, logger } from "../Ulquiorra.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { CanManageUser, CreateModEmbed } from "../util/ModUtils.js";

const KickCommand: SlashCommand = {
	name: "kick",

	async run(interaction, _client) {
		const target = interaction.options.getMember("member") as GuildMember;
		const reason = interaction.options.getString("reason") ?? "no reason provided";

		const punishment = await InternalKick(interaction.member as GuildMember, target, reason);
		if (typeof punishment === "string") return punishment;

		const channelEmbed = CreateEmbed(`${target} has been kicked: **${reason}**`);
		const replyEmbed = CreateModEmbed(interaction.user, target.user, punishment);

		interaction.channel.sendTyping().then(() => {
			interaction.channel.send({ embeds: [channelEmbed] });
		});

		interaction.reply({ embeds: [replyEmbed], ephemeral: true });
	},
};

export async function InternalKick(mod: GuildMember, target: GuildMember, reason: string) {
	if (!target) return GetError("UserUnavailable");

	const userConfig = await GetUserConfig(mod.id, "kicking user");
	const targetConfig = await GetUserConfig(target.id, "kicking user");

	if (!CanManageUser(userConfig, targetConfig) || target.user.bot || !target.kickable) return GetError("BadUser");

	// create a snowflake for the punishment
	const punishmentId = SnowFlake.getUniqueID().toString();

	// create the punishment
	const punishment = await PunishmentConfig.create({
		punishmentId: punishmentId,
		user: target.id,
		mod: mod.id,
		type: PunishmentType.Kick,
		reason: reason,
		at: Math.floor(Date.now() / 1000),
		active: false,
	});

	logger.log(`${target.user.tag} (${target.id}) has been kicked by ${mod.user.tag} (${mod.user.id}): ${reason}. ID: ${punishmentId}`);

	const modEmbed = CreateModEmbed(mod.user, target.user, punishment);
	const userEmbed = CreateModEmbed(mod.user, target.user, punishment, {
		userEmbed: true,
	});
	target
		.send({ embeds: [userEmbed.embed] })
		.catch(() => {
			return;
		})
		.finally(() => {
			target.kick(`Kicked by ${mod.user.tag}: ${reason}`).catch((e) => {
				logger.log(`Couldn't kick user ${target.id}: ${e}`, "error");
			});
		});
	GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

	return punishment;
}

export default KickCommand;
