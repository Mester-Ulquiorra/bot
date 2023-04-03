import openAI from "openai";
import config from "../../config.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, hyperlink } from "discord.js";
import CreateEmbed, { EmbedColor } from "../CreateEmbed.js";
import { GetGuild, GetSpecialChannel } from "../ClientUtils.js";
import { InternalMute } from "../../commands/Mute.js";
import { GetPunishmentLength, GetPunishmentReason } from "../Reishi.js";

const openAIClient = new openAI.OpenAIApi(new openAI.Configuration({
    apiKey: config.DANGER.OPENAI_KEY,
    organization: "org-Kbs9ivFi1DztnDIY5vxnACg6"
}));

const SystemMessage = `You are ModGPT. 
Your job is to analyse each message that gets sent to you and return with a response that shows how likely the message is to have an insult. Our community encourages people not to exclude anyone from the conversation, so please also count messages which are trying to "shut down" someone talking as insults. Example: "nobody asked for your opinion" is clearly trying to exclude the recipient from the conversation. Also, the community is generally for an older audience, so we're fine with some adult topics, like pornography, but please don't include any messages that are clearly trying to be offensive or hurtful.
Use the following format: type (level) comment. Please always follow this format, otherwise you might break the system.
Type is either of the following: "insult" if the message contains an insult, "safe" if contains no insults or a swear word is used but not as an insult, and "suspicious" if you cannot decide. Next up, level is a number ranging from 1% to 100%, and shows how sure you are. And finally, comment is just a short sentence that explains what you found.
Here is an example: "insult (100%) This message contains an insult".
And remember, this is the Internet, look for abbreviations and intentional filter bypasses (i.e., using Leetspeak).`;

const InsultRegex = /(insult|safe|suspicious)\s+\((\d{1,3})%\)\s+(?:-?\s*)(.+)/;

interface InsultEvaluation {
    type: "insult" | "safe" | "suspicious";
    level: number;
    comment: string;
}

async function CheckInsult(message: string): Promise<InsultEvaluation> {
    const response = await openAIClient.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: SystemMessage },
            { role: "user", content: message }
        ]
    });

    if (response.data.choices.length === 0) return null;

    const evaluation = response.data.choices[0].message?.content;
    if (!evaluation) return null;

    const match = evaluation.match(InsultRegex);
    if (!match) return null;

    const type = match[1] as "insult" | "safe" | "suspicious";
    const level = parseInt(match[2]);
    const comment = match[3];

    return { type, level, comment };
}

export default async function DetectInsult(message: Message) {
    const response = await CheckInsult(message.content);
    if (!response) return null;

    if (response.type === "insult") {
        // punish if level is over 80%
        if (response.level >= 80) {
            return response.comment;
        } else {
            SendWarningEmbed(message, response);
        }
    }

    if (response.type === "suspicious") {
        SendWarningEmbed(message, response);
    }

    return null;
}

function SendWarningEmbed(message: Message, reason: InsultEvaluation) {
    // create a message preview, if it's over 1024 characters long, add 3 dots at the end (make sure the total length is 1024)
    const messagePreview = message.content.length > 1024 ? message.content.substring(0, 1021) + "..." : message.content;
    const embed = CreateEmbed(`**A ${hyperlink("message", message.url)} from ${message.author} in ${message.channel} has been flagged by automod**`, {
        color: EmbedColor.Warning, title: "Automod Warning", author: message.author
    })
        .addFields(
            { name: "Message", value: messagePreview, inline: false },
            { name: "Type", value: reason.type, inline: true },
            { name: "Level", value: `${reason.level}%`, inline: true },
            { name: "Comment", value: reason.comment, inline: false }
        );

    // create components for the embed
    const components = [new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("automod.approve")
                .setLabel("Approve and mute")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("automod.deny")
                .setLabel("Mark as false positive")
                .setStyle(ButtonStyle.Success)
        )];

    GetSpecialChannel("Automod").send({ embeds: [embed], components })
        .then(msg => {
            msg.awaitMessageComponent({
                filter: i => i.customId === "automod.approve" || i.customId === "automod.deny",
                componentType: ComponentType.Button
            })
                .then(async interaction => {
                    if (interaction.customId === "automod.approve") {
                        message.delete();
                        InternalMute(await GetGuild().members.fetchMe(), message.member, GetPunishmentLength("Insult"), `${GetPunishmentReason("Insult")} [Approved by ${interaction.user}]`, reason.comment);

                        const embed = EmbedBuilder.from(msg.embeds[0]);
                        embed.setDescription(embed.data.description + `\n**[Approved by ${interaction.user}]**`);
                        embed.setColor(EmbedColor.Error);
                        interaction.update({ embeds: [embed], components: [] });
                    }

                    if (interaction.customId === "automod.deny") {
                        const embed = EmbedBuilder.from(msg.embeds[0]);
                        embed.setDescription(embed.data.description + `\n**[Marked as false positive by ${interaction.user}]**`);
                        embed.setColor(EmbedColor.Success);
                        interaction.update({ embeds: [embed], components: [] });
                    }
                });
        });
}