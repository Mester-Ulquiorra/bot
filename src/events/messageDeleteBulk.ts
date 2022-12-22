import { Collection, GuildTextBasedChannel, Message, Snowflake } from "discord.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";

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