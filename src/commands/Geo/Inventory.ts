import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { CalculateMaxPage } from "../../util/MathUtils.js";
import GeoData, { ItemDescriptions, ItemNames, ItemPrices } from "./GeoData.js";
import { GetGeoConfig, IsSellableItem } from "./Util.js";

const InventoryCommand: SlashCommand = {
    name: "_",
    async run(interaction) {
        const geoConfig = await GetGeoConfig(interaction.user.id);
        const embed = CreateEmbed(null, { title: `Inventory of ${interaction.user.username}` });
        const page = interaction.options.getNumber("page") ?? 1;

        // check if the page is valid
        if (page > CalculateMaxPage(geoConfig.inventory.items.length, 10)) {
            return "That page doesn't exist.";
        }

        embed.setFooter({
            text: `Page ${page} of ${CalculateMaxPage(geoConfig.inventory.items.length, 10)}`
        });

        if (geoConfig.inventory.items.length === 0) {
            embed.setDescription("**You don't have any items in your inventory.**");
            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        for (const item of geoConfig.inventory.items.slice((page - 1) * 10, page * 10)) {
            const friendlyName = ItemNames[item.name];
            const price = IsSellableItem(item.name) ? ItemPrices[item.name] : null;

            const itemText = `${item.count}x ${friendlyName}`;
            const sellText = price ? `\n**Sell:** ${price.min}-${price.max} ${GeoData.GeoIcon}` : "";

            embed.addFields({
                name: itemText + sellText,
                value: ItemDescriptions[item.name],
                inline: false
            });
        }

        interaction.reply({ embeds: [embed] });
    }
};

export default InventoryCommand;
