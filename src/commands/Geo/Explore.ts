import { GuildMember } from "discord.js";
import config from "../../config.js";
import { DBGeo } from "../../database/GeoConfig.js";
import testMode from "../../testMode.js";
import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import GeoFight from "./Fight.js";
import GeoData, { ArtifactNames, GeoChance, GeoEvent, GeoItems, RelicNames } from "./GeoData.js";
import { GetGeoConfig, GetGeoMultiplier, extractWeights } from "./Util.js";

const ExploreCommand: SlashCommand = {
	name: "_",
	async run(interaction, client) {
		const geoConfig = await GetGeoConfig(interaction.user.id);
		const multipliers = await GetGeoMultiplier(interaction.member as GuildMember, geoConfig);

		// check if user is fighting
		if (GeoFight.isFighting(interaction.user.id)) return "Don't be a coward, finish your fight first!";

		// check if user can explore
		if (Date.now() - geoConfig.explore.lastExplore < GeoData.Explore.Cooldown && !(config.MesterId === interaction.user.id && testMode))
			return `Woah, not so fast buddy, you can explore again in ${Math.round(
				(GeoData.Explore.Cooldown - (Date.now() - geoConfig.explore.lastExplore)) / 1000
			)} seconds`;

		const exploreEvent = GeoChance.weighted(...extractWeights(GeoData.Explore.Events, multipliers));

		switch (exploreEvent) {
			case "geo": {
				geoConfig.explore.lastExplore = Date.now();
				const amountEvent = GeoChance.weighted(...extractWeights(GeoData.Explore.GeoAmountEvents, multipliers));
				const amount = Math.floor(GetGeoAmount(amountEvent) * multipliers.geo);

				geoConfig.balance.geo += amount;

				const embed = CreateEmbed(GeoChance.pickone(GeoData.Explore.GeoPreSentences).replace("_", amount.toString()));
				interaction.reply({ embeds: [embed] });
				break;
			}
			case "nothing": {
				geoConfig.explore.lastExplore = Date.now();
				const embed = CreateEmbed("You looked in every small corner of the area, but unfortunately you found nothing...");
				interaction.reply({ embeds: [embed] });
				break;
			}
			case "relic": {
				geoConfig.explore.lastExplore = Date.now();
				const relicName = GeoChance.weighted(...extractWeights(GeoData.Explore.RelicChances, multipliers));
				const friendlyName = RelicNames[relicName];

				addItemToInventory(geoConfig, relicName);

				const embed = CreateEmbed(`You found a(n) ${friendlyName} relic!`);
				interaction.reply({ embeds: [embed] });
				break;
			}
			case "artifact": {
				geoConfig.explore.lastExplore = Date.now();
				const artifactName = GeoChance.weighted(...extractWeights(GeoData.Explore.ArtifactChances, multipliers));
				const friendlyName = ArtifactNames[artifactName];

				addItemToInventory(geoConfig, artifactName);

				const embed = CreateEmbed(`You found a(n) ${friendlyName} artifact!`);
				interaction.reply({ embeds: [embed] });
				break;
			}
			case "npc": {
				const embed = CreateEmbed("You found an NPC!\nUnfortunately, this feature is not implemented yet.");
				interaction.reply({ embeds: [embed], ephemeral: true });
				break;
			}
			case "enemy": {
				const message = await interaction.deferReply({ fetchReply: true });
				await GeoFight.build(message, interaction.member as GuildMember);
				break;
			}
			default: {
				const embed = CreateEmbed(
					`This is weird, you accidentally managed to not find anything, even nothing... perhaps it is not implemented yet?\nEvent you got: ${exploreEvent}`,
					{
						color: "error",
					}
				);
				interaction.reply({ embeds: [embed], ephemeral: true });
				break;
			}
		}

		geoConfig.save();
	},
};

function addItemToInventory(geoConfig: DBGeo, itemName: GeoItems, count = 1) {
	// check if user already has that artifact in inventory and if so, add to count
	const relicIndex = geoConfig.inventory.items.findIndex((item) => item.name === itemName);
	if (relicIndex !== -1) {
		geoConfig.inventory.items[relicIndex].count++;
	} else {
		geoConfig.inventory.items.push({
			name: itemName,
			count,
		});
	}
}

function GetGeoAmount(event: GeoEvent) {
	switch (event) {
		case "small":
			return GeoChance.integer({ min: 1, max: 10 });
		case "medium":
			return GeoChance.integer({ min: 15, max: 30 });
		case "large":
			return GeoChance.integer({ min: 50, max: 90 });
		case "huge":
			return GeoChance.integer({ min: 100, max: 200 });
		case "kinglike":
			return GeoChance.integer({ min: 200, max: 500 });
	}
}

export default ExploreCommand;
