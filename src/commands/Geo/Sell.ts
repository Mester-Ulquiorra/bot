import { GuildMember } from "discord.js";
import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import GeoData, { GeoChance, ItemNames, ItemPrices } from "./GeoData.js";
import { GetGeoConfig, GetMultipliers, IsGeoItem } from "./Util.js";

const SellCommand: SlashCommand = {
    name: "_",
    async run(interaction, client) {
        const geoConfig = await GetGeoConfig(interaction.user.id);

        const itemName = interaction.options.getString("item");
        const amount = interaction.options.getNumber("amount") ?? 1;

        if (!IsGeoItem(itemName)) return "That item doesn't even exist, yet you somehow managed to sell it.\nAre you a cheater?";

        const userItem = geoConfig.inventory.items.find(i => i.name === itemName);
        if (!userItem) return "You don't have that item in your inventory.";
        if (userItem.count < amount) return "You don't have that many of that item in your inventory.";

        const price = ItemPrices[itemName];
        const multiplier = (await GetMultipliers(interaction.member as GuildMember, geoConfig)).geo;
        const total = Math.floor(GeoChance.integer({ min: price.min, max: price.max }) * amount * multiplier);

        geoConfig.balance.geo += total;
        userItem.count -= amount;
        if (userItem.count === 0) geoConfig.inventory.items.splice(geoConfig.inventory.items.indexOf(userItem), 1);

        await geoConfig.save();

        const embed = CreateEmbed(`You sold ${amount} ${ItemNames[itemName]} for ${total} ${GeoData.GeoIcon}`);
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

export default SellCommand;