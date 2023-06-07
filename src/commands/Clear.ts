import { format } from "date-fns";
import { Message } from "discord.js";
import { logger } from "../Ulquiorra.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { ModNameToLevel } from "../util/ModUtils.js";
const ClearCommmand: SlashCommand = {
    name: "clear",
    async run(interaction, client) {
        const userConfig = await GetUserConfig(interaction.user.id, "clearing messages");
        if (userConfig.mod < ModNameToLevel("Head")) return GetError("InsufficentModLevel");

        await interaction.deferReply({ ephemeral: true });

        const count = interaction.options.getInteger("count", true);
        const user = interaction.options.getUser("member", false);

        let messagesToDelete = new Array<Message<true>>();

        await interaction.channel.messages.fetch().then(messages => {
            // filter only the messages from the user (if specified)
            if (user) messages = messages.filter(m => m.author.id === user.id);

            if (count >= messages.size) messagesToDelete = messages.map(m => m);
            else messagesToDelete = messages.map(m => m).slice(0, count);
        });

        messagesToDelete.reverse();

        // generate a text file for all the messages
        let messagesText = `Bulk delete report generated at ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`;
        for (const message of messagesToDelete.map(m => m)) {
            const nickname = message.member?.nickname ? ` (${message.member.nickname})` : null;
            messagesText += `\n${message.author.tag}${nickname ?? ""} [${format(message.createdTimestamp, "yyyy-MM-dd HH:mm:ss")}]: ${message.content}`;
        }

        interaction.channel.bulkDelete(messagesToDelete);

        const embed = CreateEmbed(`Successfully deleted ${messagesToDelete.length} messages!`, { color: "success" });
        const logEmbed = CreateEmbed(`**${interaction.user} has deleted ${messagesToDelete.length} messages in ${interaction.channel}**`);

        logger.log(`${interaction.user.tag} (${interaction.user.id}) has deleted ${messagesToDelete.length} messages in ${interaction.channel.name} (${interaction.channelId})`);

        interaction.editReply({ embeds: [embed] });
        GetSpecialChannel("MessageLog").send({
            embeds: [logEmbed], files: [
                {
                    attachment: Buffer.from(messagesText),
                    name: "messages.txt",
                    description: "Text file containing all the deleted messages",
                }
            ]
        });
    }
};

export default ClearCommmand;