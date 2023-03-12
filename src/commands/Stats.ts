import SlashCommand from "../types/SlashCommand.js";
import SteamStatsCommand from "./Stats/Steam.js";

const StatsCommand: SlashCommand = {
    name: "stats",

    async run(interaction, client) {
        if (interaction.options.getSubcommandGroup() === "steam") {
            return SteamStatsCommand.run(interaction, client);
        }
    },

    async runAutocomplete(interaction, client) {
        if(interaction.options.getSubcommandGroup() === "steam") {
            return SteamStatsCommand.runAutocomplete(interaction, client);
        }
    }
};



export default StatsCommand;