import { Message } from "discord.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import { ModNameToLevel } from "../util/ModUtil.js";

const ClearCommmand: SlashCommand = {
    name: "clear",
    async run(interaction, client) {
        const userConfig = await GetUserConfig(interaction.user.id);
        if (userConfig.mod < ModNameToLevel("Head")) return GetError("InsufficentModLevel");

        await interaction.deferReply({ ephemeral: true });

        const count = interaction.options.getInteger("count", true);
        const user = interaction.options.getUser("member", false);

        let messagesToDelete: string[] = [];

        await interaction.channel.messages.fetch().then(messages => {
            if (user) messages = messages.filter(m => m.author.id === user.id);

            if (count >= messages.size) messagesToDelete = messages.map(m => m.id);
            else messagesToDelete = messages.map(m => m.id).slice(0, count);
        });

        interaction.channel.bulkDelete(messagesToDelete);

        const embed = CreateEmbed(`Successfully deleted ${messagesToDelete.length} messages!`, { color: EmbedColor.Success });
        const logEmbed = CreateEmbed(`**${interaction.user} has deleted ${messagesToDelete.length} messages in ${interaction.channel}**`);

        Log(`${interaction.user.tag} (${interaction.user.id}) has deleted ${messagesToDelete.length} messages in ${interaction.channel.name} (${interaction.channelId})`);

        interaction.editReply({ embeds: [embed] });
        GetSpecialChannel("MessageLog").send({ embeds: [logEmbed] });
    }
}

export default ClearCommmand;