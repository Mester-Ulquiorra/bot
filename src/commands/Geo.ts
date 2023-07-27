import SlashCommand from "../types/SlashCommand.js";
import * as Commands from "./Geo/Commands.js";

const GeoCommand: SlashCommand = {
	name: "geo",
	description: "The main command of the Economy system",
	async run(interaction, client) {
		switch (interaction.options.getSubcommand()) {
			case "balance":
				return Commands.Balance.run(interaction, client);
			case "explore":
				return Commands.Explore.run(interaction, client);
			case "inventory":
				return Commands.Inventory.run(interaction, client);
			case "sell":
				return Commands.Sell.run(interaction, client);
		}
	},
};

export default GeoCommand;
