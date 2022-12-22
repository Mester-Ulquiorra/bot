import SlashCommand from "../types/SlashCommand.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import ConvertDuration from "../util/ConvertDuration.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { ModNameToLevel } from "../util/ModUtil.js";

const SlowmodeCommand: SlashCommand = {
    name: "slowmode",

    async run(interaction, _client) {
        const userConfig = await GetUserConfig(interaction.user.id);
        if (userConfig.mod < ModNameToLevel("Head")) return GetError("Permission");

        // get the duration format and try to convert it
        const duration = ConvertDuration(interaction.options.getString("duration"));

        if (isNaN(duration) || duration > 21600) return GetError("Duration");

        const channel = interaction.channel;

        if (channel.isThread()) return "You cannot use this command in threads";

        channel.edit({
            rateLimitPerUser: duration,
            reason: `Slowmode enabled by ${interaction.user.tag}`
        });

        const embed = CreateEmbed(`${interaction.user} has set the slowmode to **${duration} seconds**`, { color: EmbedColor.Success });
        interaction.reply({ embeds: [embed] });
    }
}

export default SlowmodeCommand;