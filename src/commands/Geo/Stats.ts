import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { GetGeoConfig } from "./Util.js";

const StatsCommand: SlashCommand = {
	name: "_",
	description: "View your Geo stats",

	async run(interaction) {
		// get geo config
		const geoConfig = await GetGeoConfig(interaction.user.id);

		// create embed
		const embed = CreateEmbed(null, { title: `**Player stats of ${interaction.user.username}**` });
		embed.addFields(
			{ name: "Max health", value: `${geoConfig.stats.hp}`, inline: true },
			{ name: "Attack", value: geoConfig.stats.attack.toString(), inline: true },
			{ name: "Defense", value: geoConfig.stats.defense.toString(), inline: true },
			{ name: "Mana regen", value: geoConfig.stats.speed.toString(), inline: true },
			{ name: "Max mana", value: geoConfig.stats.mana.toString(), inline: true }
		);

		// send embed
		await interaction.reply({ embeds: [embed] });
	},
};

export default StatsCommand;
