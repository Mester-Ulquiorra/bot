import { Chance } from "chance";
import config from "../../config.js";
import testMode from "../../testMode.js";
import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed, { EmbedColor } from "../../util/CreateEmbed.js";
import GeoData, { extractWeights, GeoEvent, RelicNames } from "./GeoData.js";
import { GetGeoConfig } from "./Util.js";
const chance = new Chance();

const ExploreCommand: SlashCommand = {
    name: "_",
    async run(interaction, client) {
        const geoConfig = await GetGeoConfig(interaction.user.id);
        // check if user can explore
        if (Date.now() - geoConfig.explore.lastExplore < GeoData.Explore.Cooldown && !(config.MesterId === interaction.user.id && testMode)) return `Woah not so fast buddy, you can explore again in ${Math.round((GeoData.Explore.Cooldown - (Date.now() - geoConfig.explore.lastExplore)) / 1000)} seconds`;

        const exploreEvents = extractWeights(GeoData.Explore.Events);
        const exploreEvent = chance.weighted(exploreEvents.names, exploreEvents.weights);

        switch (exploreEvent) {
            case "geo": {
                geoConfig.explore.lastExplore = Date.now();
                const amountEvents = extractWeights(GeoData.Explore.GeoAmountEvents);
                const amountEvent = chance.weighted(amountEvents.names, amountEvents.weights);
                const amount = GetGeoAmount(amountEvent);

                geoConfig.balance.geo += amount;

                const embed = CreateEmbed(chance.pickone(GeoData.Explore.GeoPreSentences).replace("_", amount.toString()));
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
                const relicEvents = extractWeights(GeoData.Explore.RelicChances);
                const relicName = chance.weighted(relicEvents.names, relicEvents.weights);
                const relicFriendlyName = RelicNames[relicName];

                // check if user already has relic in inventory and if so, add to count
                const relicIndex = geoConfig.inventory.items.findIndex(item => item.name === relicName);
                if (relicIndex !== -1) {
                    geoConfig.inventory.items[relicIndex].count++;
                } else {
                    geoConfig.inventory.items.push({
                        name: relicName,
                        count: 1
                    });
                }

                const embed = CreateEmbed(`You found a(n) ${relicFriendlyName}!`);
                interaction.reply({ embeds: [embed] });
                break;
            }
            case "artifact": {
                const embed = CreateEmbed("You found an artifact!\nUnfortunately, this feature is not implemented yet.");
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            case "npc": {
                const embed = CreateEmbed("You found an NPC!\nUnfortunately, this feature is not implemented yet.");
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            case "enemy": {
                const embed = CreateEmbed("You found an enemy!\nThank god the fight system doesn't exist yet, you don't even have a weapon!");
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
            default: {
                const embed = CreateEmbed(`This is weird, you accidentally managed to not find anything, even nothing... perhaps it is not implemented yet?\nEvent you got: ${exploreEvent}`, {
                    color: EmbedColor.Error
                });
                interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
        }

        geoConfig.save();
    }
};

function GetGeoAmount(event: GeoEvent) {
    switch (event) {
        case "small": return chance.integer({ min: 1, max: 10 });
        case "medium": return chance.integer({ min: 15, max: 30 });
        case "large": return chance.integer({ min: 50, max: 90 });
        case "huge": return chance.integer({ min: 100, max: 200 });
        case "kinglike": return chance.integer({ min: 200, max: 500 });
    }
}

export default ExploreCommand;