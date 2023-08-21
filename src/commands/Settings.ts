import { ChatInputCommandInteraction } from "discord.js";
import SlashCommand, { SlashCommandReturnValue } from "../types/SlashCommand.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";

const SettingsCommand: SlashCommand = {
	name: "settings",

	async run(interaction, client) {
		// get subcommand
		const subcommand = interaction.options.getSubcommand(false);

		if (subcommand === "game_invites") return ManageGameInvites(interaction);
		if (subcommand === "protected_delete") return ManageProtectedDelete(interaction);
	},
};

async function ManageGameInvites(interaction: ChatInputCommandInteraction): Promise<SlashCommandReturnValue> {
	const enabled = interaction.options.getBoolean("enabled", true);
	const userConfig = await GetUserConfig(interaction.user.id, "changing game invites setting");

	userConfig.settings.allowGameInvites = enabled;
	await userConfig.save();

	const embed = CreateEmbed(`Incoming game invites have been ${enabled ? "enabled" : "disabled"}!`, {
		color: enabled ? "success" : "error",
	});
	interaction.reply({
		embeds: [embed],
		ephemeral: true,
	});
}

async function ManageProtectedDelete(interaction: ChatInputCommandInteraction): Promise<SlashCommandReturnValue> {
	const enabled = interaction.options.getBoolean("enabled", true);
	const userConfig = await GetUserConfig(interaction.user.id, "changing protected delete setting");

	userConfig.settings.deleteProtectedMutes = enabled;
	await userConfig.save();

	const embed = CreateEmbed(`Protected delete has been ${enabled ? "enabled" : "disabled"}!`, {
		color: enabled ? "success" : "error",
	});
	interaction.reply({
		embeds: [embed],
		ephemeral: true,
	});
}

export default SettingsCommand;
