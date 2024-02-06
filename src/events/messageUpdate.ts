import { ChannelType, Message } from "discord.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { CheckMessage } from "../util/Reishi.js";

const MaxContentLength = 1021;

const MessageUpdateEvent: Event = {
    name: "messageUpdate",

    async run(client, oldMessage: Message, newMessage: Message) {
        if (newMessage.author.bot || newMessage.channel.type === ChannelType.DM) {
            return;
        }

        // check if the message actually changed
        if (oldMessage.pinned !== newMessage.pinned) {
            return;
        }
        if (oldMessage.attachments.size === newMessage.attachments.size && oldMessage.content === newMessage.content) {
            return;
        }

        // create a new embed
        const embed = CreateEmbed(
            `**Message sent by <@${oldMessage.author.id}> has been edited in ${oldMessage.channel}** [Jump to message](${newMessage.url})`,
            { color: "warning" }
        ).setFooter({
            text: `Member ID: ${oldMessage.author.id} | Message ID: ${oldMessage.id}`
        });

        if (oldMessage.content !== newMessage.content) {
            // add an ellipsis to the old content
            let oldMessageContent = oldMessage.content != "" ? oldMessage.content : "[nothing]";
            if (oldMessage.content.length > MaxContentLength) {
                oldMessageContent = `${oldMessage.content.substring(0, MaxContentLength)}...`;
            }

            // do the same for the new content
            let newMessageContent = newMessage.content;
            if (newMessage.content.length > MaxContentLength) {
                newMessageContent = `${newMessage.content.substring(0, MaxContentLength)}...`;
            }

            embed.addFields(
                {
                    name: "Old content",
                    value: oldMessageContent,
                    inline: false
                },
                {
                    name: "New content",
                    value: newMessageContent,
                    inline: false
                }
            );
        }

        if (oldMessage.attachments.size !== newMessage.attachments.size && oldMessage.attachments.size > 0) {
            // create the field for attachments
            // message.attachments is a collection, so we need to convert it to an array
            const oldAttachments = oldMessage.attachments.map((attachment) => attachment.url);
            const newAttachments = newMessage.attachments.map((attachment) => attachment.url);

            // if there are attachments and the new and old attachments aren't the same, add the fields
            embed.addFields(
                {
                    name: "Old attachments",
                    value: oldAttachments.join("\n"),
                    inline: false
                },
                {
                    name: "New attachments",
                    // if there are no new attachments, add "None"
                    value: newAttachments.length > 0 ? newAttachments.join("\n") : "None",
                    inline: false
                }
            );
        }

        // finally, get the message log channel and send the embed
        GetSpecialChannel("MessageLog").send({ embeds: [embed] });

        // now let's check again for profanity, links etc.
        if (oldMessage.content === newMessage.content) {
            return;
        }

        CheckMessage(newMessage);
    }
};

export default MessageUpdateEvent;
