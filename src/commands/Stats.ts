import SlashCommand from "../types/SlashCommand.js";
import SteamStatsCommand from "./Stats/Steam.js";

const StatsCommand: SlashCommand = {
    name: "stats",

    async run(interaction, client) {
        if (interaction.options.getSubcommandGroup() === "steam") {
            if (SteamStatsCommand.run) {
                return SteamStatsCommand.run(interaction, client);
            }
            return "Unloaded Steam stats command";
        }
    },

    async runAutocomplete(interaction, client) {
        if (interaction.options.getSubcommandGroup() === "steam") {
            if (SteamStatsCommand.runAutocomplete) {
                return SteamStatsCommand.runAutocomplete(interaction, client);
            }

            interaction.respond([{ name: "This is an error", value: "okbro" }]);
        }
    }
};

export default StatsCommand;
