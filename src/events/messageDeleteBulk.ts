import { Collection, GuildTextBasedChannel, Message, Snowflake } from "discord.js";
import Event from "../types/Event";
import { GetSpecialChannel } from "../util/ClientUtils";
import CreateEmbed from "../util/CreateEmbed";

const MessageDeleteBulkEvent: Event = {
    name: "messageDeleteBulk",
    async run(_client, messages: Collection<Snowflake, Message>, channel: GuildTextBasedChannel) {
        const embed = CreateEmbed(`Bulk delete in ${channel}`)
            .addFields(
                {
                    name: "Messages deleted",
                    value: messages.size.toString(),
                    inline: true
                },
            );
        
        GetSpecialChannel("MiscLog").send({ embeds: [embed] });
    }
}

export default MessageDeleteBulkEvent;