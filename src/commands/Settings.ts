import { ChatInputCommandInteraction } from "discord.js";
import SlashCommand, { SlashCommandReturnValue } from "../types/SlashCommand.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";

const SettingsCommand: SlashCommand = {
    name: "settings",

    async run(interaction, client) {
        // get subcommand
        const subcommand = interaction.options.getSubcommand(false);

        if (subcommand === "game_invites") return ManageGaveInvites(interaction);
    }
};

async function ManageGaveInvites(interaction: ChatInputCommandInteraction): Promise<SlashCommandReturnValue> {
    const enabled = interaction.options.getBoolean("enabled");
    const userConfig = await GetUserConfig(interaction.user.id, "changing game invites setting");

    userConfig.settings.allowGameInvites = enabled;
    await userConfig.save();

    const embed = CreateEmbed(`Incoming game invites have been ${enabled ? "enabled" : "disabled"}!`, { color: enabled ? "success" : "error" });
    interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

export default SettingsCommand;