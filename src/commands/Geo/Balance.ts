import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import GeoData from "./GeoData.js";
import { GetGeoConfig } from "./Util.js";

const BalanceGeoCommand: SlashCommand = {
    name: "_",
    async run(interaction, client) {
        const target = interaction.options.getUser("member") ?? interaction.user;
        const geoConfig = await GetGeoConfig(target.id);
        if (!geoConfig.balance.public && target.id !== interaction.user.id) return "This user's balance is private";

        const embed = CreateEmbed(`Balance of ${target}`)
            .addFields(
                {
                    name: "Geo",
                    value: `${geoConfig.balance.geo} ${GeoData.GeoIcon}`,
                }
            )
            .setFooter({ text: `Version: ${GeoData.GeoVersion}` });

        interaction.reply({ embeds: [embed], ephemeral: !geoConfig.balance.public });
    }
};

export default BalanceGeoCommand;