import SlashCommand from "../types/SlashCommand.js";
import * as Commands from "./Geo/Commands.js";

const GeoCommand: SlashCommand = {
	name: "geo",
	description: "The main command of the Economy system",
	async run(interaction, client) {
		switch (interaction.options.getSubcommand()) {
			case "balance":
				return Commands.Balance.run ? Commands.Balance.run(interaction, client) : "Missing Geo balance command";
			case "explore":
				return Commands.Explore.run ? Commands.Explore.run(interaction, client) : "Missing Geo explore command";
			case "inventory":
				return Commands.Inventory.run ? Commands.Inventory.run(interaction, client) : "Missing Geo inventory command";
			case "sell":
				return Commands.Sell.run ? Commands.Sell.run(interaction, client) : "Missing Geo sell command";
			case "stats":
				return Commands.Stats.run ? Commands.Stats.run(interaction, client) : "Missing Geo stats command";
		}
	},
};

export default GeoCommand;
