import { ChannelType, Message } from "discord.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";

const MaxContentLength = 1021;

const MessageDeleteEvent: Event = {
    name: "messageDelete",

    async run(client, message: Message) {
        if (message.author.bot || message.channel.type === ChannelType.DM) {
            return;
        }

        // check if the message is a reply and if that's true, store the replied message in repliedMessage
        const repliedMessage = message.reference?.messageId
            ? await message.channel.messages.fetch(message.reference.messageId).catch(() => {
                  return null;
              })
            : null;

        const repliedUser = message.mentions.repliedUser;
        const repliedWithPing = repliedMessage != null && repliedUser && message.mentions.has(repliedUser) ? `Yes` : "No";

        let realContent = message.content;
        // this weird thing appends "..." to the end of the message content if it's too long
        if (realContent.length > MaxContentLength) {
            realContent = `${realContent.substring(0, MaxContentLength)}...`;
        }

        // create the embed
        const embed = CreateEmbed(`**Message sent by ${message.author} has been deleted in ${message.channel.toString()}**`, {
            color: "error"
        });
        if (realContent.length > 0) {
            embed.addFields({
                name: "Content",
                value: realContent,
                inline: false
            });
        }

        embed
            .addFields({
                name: repliedMessage != null ? "Replied to a message? (with ping?)" : "Replied to a message?",
                // 3 outcomes: Yes (Yes), Yes (No) or No
                value: repliedMessage != null ? `Yes (${repliedWithPing}) ([Jump to message](${repliedMessage.url}))` : "No",
                inline: true
            })
            .setFooter({
                text:
                    `Member ID: ${message.author.id} | Message ID: ${message.id} ` +
                    // this part adds extra information about the replied message if it exists
                    (repliedMessage != null
                        ? `| Replied user ID: ${repliedMessage.author.id} | Replied message ID: ${repliedMessage.id}`
                        : "")
            });

        // create the field for attachments
        const attachments = message.attachments.map((attachment) => {
            return attachment.url ?? "#error#";
        });

        // if there are attachments, add the field
        if (attachments.length > 0) {
            embed.addFields({
                name: "Attachments",
                value: attachments.join("\n"),
                inline: false
            });
        }

        // finally, get the message log channel and send the embed
        GetSpecialChannel("MessageLog").send({ embeds: [embed] });
    }
};

export default MessageDeleteEvent;
