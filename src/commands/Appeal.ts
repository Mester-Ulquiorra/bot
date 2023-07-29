import { DBPunishment, PunishmentType, PunishmentTypeToName } from "@mester-ulquiorra/commonlib";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, bold, inlineCode } from "discord.js";
import Ulquiorra, { logger } from "../Ulquiorra.js";
import config from "../config.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed, { EmbedColors } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import ManageRole from "../util/ManageRole.js";
import { CreateModEmbed } from "../util/ModUtils.js";
import { DetectProfanity } from "../util/Reishi/CheckProfanity.js";

const AppealCommand: SlashCommand = {
	name: "appeal",

	async runButton(interaction, client) {
		const userConfig = await GetUserConfig(interaction.user.id, null, false);

		if (!userConfig || userConfig.mod < 2) return GetError("Permission");

		if (interaction.customId === "appeal.accept") {
			return manageAppeal(interaction, true);
		}

		if (interaction.customId === "appeal.decline") {
			return manageAppeal(interaction, false);
		}
	},

	async runModal(modal, client) {
		if (!/appeal\.appealmodal-\d+/.test(modal.customId)) return;

		const punishmentId = modal.customId.match(/appeal\.appealmodal-(\d+)/)[1];

		// validate punishment
		const punishment = await PunishmentConfig.findOne({
			user: modal.user.id,
			active: true,
			punishmentId: punishmentId,
		});

		if (!punishment) return "The punishment ID is either invalid, or the punishment is not active anymore";
		if (punishment.appealed) return "You've already appealed this punishment.";

		if (DetectProfanity(modal.fields.getTextInputValue("reason")) || DetectProfanity(modal.fields.getTextInputValue("extra")))
			return "Profanity detected in one of the fields, totally uncool";
	},
};

export async function createAppeal(userId: string, punishment: DBPunishment, reason: string, additional: string) {
	const user = await Ulquiorra.users.fetch(userId);

	// will most definitely not happen, but just in case
	if (!user || !punishment) return false;

	// create the embed
	const embed = CreateEmbed(`**Appeal request of punishment ${punishment.punishmentId} from ${user.username}**`, {
		author: user,
	})
		.addFields(
			{
				name: "Punishment type",
				value: PunishmentTypeToName(punishment.type),
				inline: false,
			},
			{
				name: "Why should your punishment be appealed?",
				value: reason,
				inline: false,
			}
		)
		.setFooter({ text: `Punishment ID: ${punishment.punishmentId}` });

	if (additional.length !== 0)
		embed.addFields({
			name: "Anything else you'd like to add?",
			value: additional,
			inline: false,
		});

	const components = [
		new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder().setLabel("Accept appeal").setStyle(ButtonStyle.Success).setCustomId("appeal.accept"),
				new ButtonBuilder().setLabel("Decline appeal").setStyle(ButtonStyle.Danger).setCustomId("appeal.decline")
			)
			.toJSON(),
		new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setLabel("Show punishment")
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(`punishmentinfo.showp-${punishment.punishmentId}`),
				new ButtonBuilder().setLabel("Show user info").setStyle(ButtonStyle.Secondary).setCustomId(`userinfo.showu-${user.id}`),
				new ButtonBuilder()
					.setLabel("Punishment history")
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(`punishmentinfo.showallp-${user.id}`)
			)
			.toJSON(),
	];

	GetSpecialChannel("Appeal").send({ embeds: [embed], components });

	return true;
}

async function manageAppeal(interaction: ButtonInteraction, accepted: boolean) {
	const punishment = await PunishmentConfig.findOne({
		punishmentId: interaction.message.embeds[0].footer.text.match(/\d+/)?.[0],
	});
	if (!punishment) return GetError("Database");

	// get the reason for the action
	const reasonMessage = await interaction.reply({
		embeds: [
			CreateEmbed(
				`**Please give a reason for your action by __replying__ to this message.** (Max. length: 500 characters)\n**Type ${inlineCode(
					"cancel"
				)} to cancel.**`
			),
		],
		fetchReply: true,
	});

	const collected = await reasonMessage.channel
		.awaitMessages({
			filter: (m) => m.author.id === interaction.user.id && m.reference?.messageId === reasonMessage.id,
			max: 1,
			time: 60_000,
		})
		.catch(() => {
			reasonMessage.delete();
			return "You've run out of time";
		});

	if (typeof collected === "string") return collected;
	collected
		.first()
		.delete()
		.then(() => {
			reasonMessage.delete();
		});

	const reason = collected.first().content;
	if (reason === "cancel") return;
	if (reason.length > 500) return "Sorry, that's too long!";

	const target = await Ulquiorra.users.fetch(punishment.user).catch(() => {
		return;
	});

	if (!target) return "User couldn't be fetched (probably deleted account)";

	// add an extra field to the embed
	const appealEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
	appealEmbed
		.setDescription(appealEmbed.data.description + `\n**${accepted ? "Accepted" : "Declined"} by ${interaction.user}**`)
		.addFields({
			name: `${accepted ? "Accept" : "Decline"} reason`,
			value: reason,
			inline: false,
		})
		.setColor(accepted ? EmbedColors.success : EmbedColors.error);

	logger.log(
		`${interaction.user.tag} (${interaction.user.id}) has ${accepted ? "accepted" : "declined"} the punishment appeal of ${
			target.tag
		} (${target.id}). ID: ${punishment.punishmentId}`
	);

	interaction.message.edit({ embeds: [appealEmbed], components: [] });

	if (!accepted) {
		target
			.send({
				embeds: [
					CreateEmbed(`**Your punishment appeal has been declined by ${interaction.user}**`, { color: "error" }).addFields({
						name: "Reason",
						value: reason,
					}),
				],
			})
			.catch(() => {
				return;
			});

		return;
	}

	const targetConfig = await GetUserConfig(target.id, "managing a punishment appeal");

	switch (punishment.type) {
		case PunishmentType.Mute: {
			targetConfig.muted = false;
			await targetConfig.save();

			const targetMember = await GetGuild()
				.members.fetch(target.id)
				.then((member) => {
					return member;
				})
				.catch(() => {
					return;
				});

			if (!targetMember) break;

			ManageRole(targetMember, config.roles.Muted, "Remove", `appeal accepted by ${interaction.user.tag}`);
			break;
		}

		case PunishmentType.Ban: {
			targetConfig.banned = false;
			await targetConfig.save();

			GetGuild()
				.members.unban(target, `appeal accepted by ${interaction.user.tag}`)
				.catch(() => {
					return;
				});
			break;
		}
	}
	punishment.active = false;
	await punishment.save();

	const modEmbed = CreateModEmbed(interaction.user, target, punishment, {
		anti: true,
		reason: `Punishment appeal accepted: ${bold(reason)}`,
	});
	const userEmbed = CreateModEmbed(interaction.user, target, punishment, {
		anti: true,
		userEmbed: true,
		reason: `Punishment appeal accepted: ${bold(reason)}`,
	});

	// TODO: send update to UCP

	GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });
}

export default AppealCommand;
