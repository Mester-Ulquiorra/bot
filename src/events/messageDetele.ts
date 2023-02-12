import { ChannelType, Message, PermissionsBitField } from "discord.js";
import testMode from "../testMode.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";

const MaxContentLength = 1021;

const MessageDeleteEvent: Event = {
    name: "messageDelete",

    async run(client, message: Message) {
        // check if the author of the message is a bot or if the author has ADMINISTRATOR permissions, if that's true then don't log the message
        if (
            message.author.bot ||
            (!testMode && message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) ||
            message.channel.type === ChannelType.DM
        )
            return;

        // check if the message is a reply and if that's true, store the replied message in replied_message
        const repliedMessage: Message = message.reference?.messageId
            ? await message.channel.messages.fetch(message.reference.messageId)
                .then((m) => { return m; })
                .catch(() => { return null; })
            : null;

        // if the message is 2 characters long and replying to us, skip logging
        if (message.content.length === 2 && repliedMessage?.author.id === client.user.id) return;

        const repliedWithPing = repliedMessage != null && message.mentions.has(message.mentions.repliedUser) ? `Yes` : "No";

        // create the embed
        const embed = CreateEmbed(`**Message sent by ${message.author} has been deleted in ${message.channel}**`)
            .addFields([
                {
                    name: "Content",
                    // this weird thing appends "..." to the end of the message content if it's too long
                    value: message.content.length > MaxContentLength
                        ? `${message.content.substring(0, MaxContentLength)}...`
                        : message.content,
                    inline: false,
                },
                {
                    name: "Replied to a message? (with ping?)",
                    // 3 outcomes: Yes (Yes), Yes (No) or No
                    value:
                        repliedMessage != null
                            ? `Yes (${repliedWithPing}) ([Jump to message](${repliedMessage.url}))`
                            : "No",
                    inline: true,
                },
            ])
            .setFooter({
                text:
                    `Member ID: ${message.author.id} | Message ID: ${message.id} `
                    +
                    // this part adds extra information about the replied message if it exists
                    (repliedMessage != null
                        ? `| Replied user ID: ${repliedMessage.author.id} | Replied message ID: ${repliedMessage.id}`
                        : "")
            });

        // create the field for attachments
        const attachments = message.attachments.map((attachment) => attachment.url || "#error#");

        // if there are attachments, add the field
        if (attachments.length > 0)
            embed.addFields([
                {
                    name: "Attachments",
                    value: attachments.join("\n"),
                    inline: false,
                },
            ]);

        // finally, get the message log channel and send the embed
        GetSpecialChannel("MessageLog").send({ embeds: [embed] });
    }
};

export default MessageDeleteEvent;