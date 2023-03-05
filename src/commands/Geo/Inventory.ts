import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { CalculateMaxPage } from "../../util/MathUtils.js";
import { ItemDescriptions, ItemNames } from "./GeoData.js";
import { GetGeoConfig } from "./Util.js";

const InventoryCommand: SlashCommand = {
    name: "_",
    async run(interaction, client) {
        const geoConfig = await GetGeoConfig(interaction.user.id);
        const embed = CreateEmbed(undefined, { title: "Your Inventory" });
        const page = interaction.options.getNumber("page") ?? 1;

        // check if the page is valid
        if (page > CalculateMaxPage(geoConfig.inventory.items.length, 10))
            return "That page doesn't exist.";

        embed.setFooter({ text: `Page ${page} of ${CalculateMaxPage(geoConfig.inventory.items.length, 10)}` });

        if (geoConfig.inventory.items.length === 0) {
            embed.setDescription("**You don't have any items in your inventory.**");
            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        for (const item of geoConfig.inventory.items.slice((page - 1) * 10, page * 10)) {
            const friendlyName = ItemNames[item.name];
            embed.addFields({
                name: `${item.count}x ${friendlyName}`,
                value: ItemDescriptions[item.name],
                inline: false
            });
        }

        interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

export default InventoryCommand;