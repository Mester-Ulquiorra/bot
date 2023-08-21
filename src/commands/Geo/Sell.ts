import { GuildMember } from "discord.js";
import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import GeoData, { GeoChance, ItemNames, ItemPrices } from "./GeoData.js";
import { GetGeoConfig, GetGeoMultiplier, IsSellableItem } from "./Util.js";

const SellCommand: SlashCommand = {
	name: "_",
	async run(interaction, client) {
		const geoConfig = await GetGeoConfig(interaction.user.id);

		const itemName = interaction.options.getString("item", true);
		const amount = interaction.options.getNumber("amount") ?? 1;

		if (!IsSellableItem(itemName)) return "That item cannot be sold, yet you somehow tried to sell it, are you a cheater?";

		const userItem = geoConfig.inventory.items.find((i) => i.name === itemName);
		if (!userItem) return "You don't have that item in your inventory.";
		if (userItem.count < amount) return "You don't have that many of that item in your inventory.";

		const price = ItemPrices[itemName];
		const multiplier = (await GetGeoMultiplier(interaction.member as GuildMember, geoConfig)).geo;
		const total = Math.floor(GeoChance.integer({ min: price.min, max: price.max }) * amount * multiplier);

		geoConfig.balance.geo += total;
		userItem.count -= amount;
		if (userItem.count === 0) geoConfig.inventory.items.splice(geoConfig.inventory.items.indexOf(userItem), 1);

		await geoConfig.save();

		const embed = CreateEmbed(`You sold ${amount} ${ItemNames[itemName]} for ${total} ${GeoData.GeoIcon}`);
		interaction.reply({ embeds: [embed] });
	},
};

export default SellCommand;
