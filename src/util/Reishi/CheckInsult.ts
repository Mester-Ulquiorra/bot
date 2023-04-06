import openAI from "openai";
import config from "../../config.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, bold, hyperlink } from "discord.js";
import CreateEmbed, { EmbedColor } from "../CreateEmbed.js";
import { GetGuild, GetSpecialChannel } from "../ClientUtils.js";
import { InternalMute } from "../../commands/Mute.js";
import { GetPunishmentLength, GetPunishmentReason, ReishiEvaluation } from "../Reishi.js";
import { SnowFlake } from "../../Ulquiorra.js";

const requests = new Array<{ request: string[], response: string, id: string; }>();

const openAIClient = new openAI.OpenAIApi(new openAI.Configuration({
    apiKey: config.DANGER.OPENAI_KEY,
    organization: config.DANGER.OPENAI_ORG
}));

const SystemMessage = `You are ModGPT, your job is to analyse each message that gets sent to you and return with a response that shows how likely the message is to have an insult. Our community encourages people not to exclude anyone from the conversation, so please also count messages which are trying to "shut down" someone talking as insults. Example: "nobody asked for your opinion" is clearly trying to exclude the recipient from the conversation. Also, the community is generally for an older audience, so we're fine with some adult topics, like pornography, but please don't include any messages that are clearly trying to be offensive or hurtful.
With each request, you will get the 5 latest messages in the channel as a chronological order as context. If the channel doesn't have enough messages, you will get less than 5. The 5th message from the top is the one you need to evaluate. Each message starts in a new line with a "from name:" prefix, where name is the username of the message's author. If the message is directly replying to someone, [replying to name] will get added. Here is an example:
from Peter#3234: hey, that's so cool, right?
from Jane#2314: I know right, this is amazing
from Peter#3234: We should do this tomorrow again
from Jake#2314 [replying to Peter#3234]: Hey guys, I don't think you should publicly announce you're vaping
from Jane#2314: didn't ask for your opinion, go back to your mommy
If you get "reason?" as a request, you must explain your evaluation of the latest request in a more detailed way. Explain it in the third person, so don't use "I evaluated it as..." etc.
For the evaluation, use the following format: type (level) comment. Please always follow this format, otherwise you might break the system.
Type is either of the following: "insult" if the message contains an insult, "safe" if contains no insults or a swear word is used but not as an insult, and "suspicious" if you cannot decide. Next up, level is a number ranging from 1% to 100%, and shows how sure you are. And finally, comment is just a short sentence that explains what you found.
Here is an example: "insult (100%) This message contains an insult".
And remember, this is the Internet, look for abbreviations and intentional filter bypasses (i.e., using Leetspeak).`;

const InsultRegex = /(insult|safe|suspicious)\s+\((\d{1,3})%\)\s+(?:-?\s*)(.+)/;

interface InsultEvaluation {
    type: "insult" | "safe" | "suspicious";
    level: number;
    comment: string;
    requestID: string;
}

async function CheckInsult(rawRequest: string[]): Promise<InsultEvaluation> {
    const request = rawRequest.join("\n");
    const response = await openAIClient.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: SystemMessage },
            { role: "user", content: request }
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

    const requestID = SnowFlake.getUniqueID().toString();
    requests.push({ request: rawRequest, response: evaluation, id: requestID });

    return { type, level, comment, requestID };
}

export default async function DetectInsult(message: Message<true>): Promise<ReishiEvaluation> {
    const request = await GenerateRequest(message);

    const response = await CheckInsult(request);
    if (!response) return null;

    if (response.type === "insult") {
        // punish if level is over 80%
        if (response.level >= 80) {
            return { comment: response.comment, requestID: response.requestID };
        } else {
            SendWarningEmbed(message, response);
        }
    }

    if (response.type === "suspicious") {
        SendWarningEmbed(message, response);
    }

    return null;
}

async function GenerateRequest(message: Message<true>) {
    // get the last 5 messages
    const messages = [...(await message.channel.messages.fetch({ before: message.id, limit: 4 }))
        .reverse()
        .map(m => m), message];

    const request = new Array<string>();
    for (const m of messages) {
        let replyingString = "";
        if (m.reference && m.reference.channelId === message.channelId) {
            const replyingMessage = await m.channel.messages.fetch(m.reference.messageId);
            if (replyingMessage)
                replyingString = ` [replying to ${replyingMessage.author.tag}]`;
        }

        request.push(`from ${m.author.tag}${replyingString !== "" ? replyingString : ""}: ${m.content === "" ? "[empty message]" : m.content}`);
    }
    return request;
}

function SendWarningEmbed(message: Message<true>, response: InsultEvaluation) {
    // create a message preview, if it's over 1024 characters long, add 3 dots at the end (make sure the total length is 1024)
    const messagePreview = message.content.length > 1024 ? message.content.substring(0, 1021) + "..." : message.content;
    const embed = CreateEmbed(`**A ${hyperlink("message", message.url)} from ${message.author} in ${message.channel} has been flagged by automod**`, {
        color: EmbedColor.Warning, title: "Automod Warning", author: message.author
    })
        .addFields(
            { name: "Message", value: messagePreview, inline: false },
            { name: "Context", value: ProcessRawRequest(requests.find(r => r.id === response.requestID).request), inline: false },
            { name: "Type", value: response.type, inline: true },
            { name: "Level", value: `${response.level}%`, inline: true },
            { name: "Comment", value: response.comment, inline: false }
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
                        InternalMute(await GetGuild().members.fetchMe(), message.member, GetPunishmentLength("Insult"), `${GetPunishmentReason("Insult")} [Approved by ${interaction.user}]`, response.comment);

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

export async function AskForReason(requestID: string) {
    const request = requests.find(r => r.id === requestID);
    if (!request) return null;
    requests.splice(requests.indexOf(request), 1);

    const response = await openAIClient.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", content: SystemMessage },
            { role: "user", content: request.request.join("\n") },
            { role: "system", content: request.response },
            { role: "user", content: "reason?" }
        ]
    });

    const reason = response.data.choices[0].message?.content;
    if (!reason) return null;

    return { request: request.request, reason };
}

export function ProcessRawRequest(request: string[]) {
    const processed = request.slice(0, request.length - 1).map(str => str.length > 100 ? str.slice(0, 97) + "..." : str);
    const lastLine = request[request.length - 1];
    const maxLength = 1024 - processed.reduce((acc, curr) => acc + curr.length, 0) - 4;
    processed.push(lastLine.length > maxLength ? "**" + lastLine.slice(0, maxLength - 3) + "...**" : bold(lastLine));
    return processed.join("\n");
}