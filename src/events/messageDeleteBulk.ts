import { format } from "date-fns";
import { Collection, GuildTextBasedChannel, Message, Snowflake } from "discord.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";

const MessageDeleteBulkEvent: Event = {
    name: "messageDeleteBulk",
    async run(_client, messages: Collection<Snowflake, Message>, channel: GuildTextBasedChannel) {
        // generate a text file for all the messages
        let messagesText = `Bulk delete report generated at ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}}`;
        for (const message of messages.map(m => m)) {
            messagesText += `\n${message.author.tag} (${message.member?.nickname ?? "#no nickname#"}) [${format(message.createdTimestamp, "yyyy-MM-dd HH:mm:ss")}]: ${message.content}`;
        }

        const embed = CreateEmbed(`**Bulk delete in ${channel}**`)
            .addFields(
                {
                    name: "Messages deleted",
                    value: messages.size.toString(),
                    inline: true
                },
            );

        GetSpecialChannel("MessageLog").send({
            embeds: [embed],
            files: [
                {
                    attachment: Buffer.from(messagesText),
                    name: "messages.txt",
                    description: "Text file containing all the deleted messages"
                }
            ]
        });
    }
};

export default MessageDeleteBulkEvent;