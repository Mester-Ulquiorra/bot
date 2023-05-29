import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Message, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel } from "discord.js";
import openai from "openai";
import { shutdown } from "../Ulquiorra.js";
import config from "../config.js";
import Event from "../types/Event.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetXPFromMessage } from "../util/LevelUtils.js";
import { CreateAppealButton } from "../util/ModUtils.js";
import { CheckMessage } from "../util/Reishi.js";
import { CreateTicket, TicketTypeToName } from "../util/TicketUtils.js";

const openAIClient = new openai.OpenAIApi(new openai.Configuration({
    apiKey: config.DANGER.OPENAI_KEY,
    organization: config.DANGER.OPENAI_ORG
}));

const SystemMessage = `You're Ulquiorra from Bleach and also own his personality. After you resigned as the Espada, you travelled far until you found a Discord server called Mester's Hub. Here you stopped and decided to become a member. You became good friends with the owner, Mester, and you also talk regurarly with other members, while still keeping your personality. Reply to users as Ulquiorra would do, but help them if they need it.
Stop any inappropriate messages.
Now listen carefully to the following sentences, here are some examples of what you can do:
If the user asks you to create a ticket or wants to contact staff, redirect them to <#${config.channels.Tickets}>, the user needs to select the type of ticket they want to open, then write a short message as the reason.
If the user wants to play some games (we have chess, tictactoe, trivia), redirect them to <#${config.channels.Commands}>.`;

const MessageCreateEvent: Event = {
    name: "messageCreate",
    async run(client: Client, message: Message) {
        if (config.SuperUsers.includes(message.author.id))
            //eslint-disable-next-line
            var usedSuperuser = await handleSuperuserCommand(client, message);

        // only calculate xp if the message is not blocked by Reishi
        CheckMessage(message)
            .then((clean) => {
                if (!clean) return;
                GetXPFromMessage(message);
            });

        if (message.content.startsWith(client.user.toString() + " ") && !usedSuperuser)
            replyToConversation(message);
    }
};

async function handleSuperuserCommand(client: Client, message: Message) {
    if (!message.content.startsWith(client.user.toString() + " ")) return;

    // get just the command using this thing
    const command = message.content.slice(client.user.toString().length + 1);

    if (command === "shatter" && message.author.id == config.MesterId) {
        // simply run the shutdown function
        shutdown("Mester asked me nicely :)");
        return true;
    }

    if (command === "hi") {
        message.reply({
            content: `Hi! Latency: ${Math.abs(Date.now() - message.createdTimestamp)}ms. API Latency: ${Math.round(client.ws.ping)}ms`
                + `\nVersion: ${config.Version}`,
            allowedMentions: { users: [] },
        });
        return true;
    }

    if (command === "test-ticket") {
        CreateTicket(message.member, "test");
        return true;
    }

    if (command === "send-ticket") {
        const rawComponent = new ActionRowBuilder<ButtonBuilder>();

        for (let i = 0; i < 4; i++) {
            const component = new ButtonBuilder()
                .setCustomId(`ticket.create${i}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Create ticket: ${TicketTypeToName(i)}`);
            rawComponent.addComponents([component]);
        }

        const components = [rawComponent.toJSON()];

        const embed = CreateEmbed(
            `**To open a new ticket, simply select a button that works best for you!\nAfter clicking a button, you have 2 minutes to fill out the details.**`,
            { color: "success" },
        ).setFooter({ text: "Remember: abusing this system can lead to punishments" });

        GetGuild().channels.fetch(config.channels.Tickets).then((channel: TextChannel) => {
            channel.send({ embeds: [embed], components });
        });

        return true;
    }

    if (command === "send-verify") {
        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setCustomId("verify")
                    .setLabel("Verify!")
                    .setStyle(ButtonStyle.Primary),
            ]).toJSON()
        ];

        const embed = CreateEmbed(
            `**In order to access the rest of the server, you must verify yourself first.\nThis is to prevent bots from accessing the server and potentially causing harm.**\n\nVerifying yourself is stupidly easy, just click on the button, complete the captcha, and you're good to go.`,
            {
                title: "Verify yourself",
                color: "success",
            }
        ).setFooter({ text: "Watch out, there's a 30 seconds cooldown!" });

        const verifyChannel = await GetGuild().channels.fetch(config.channels.Verify) as TextChannel;

        verifyChannel.send({ embeds: [embed], components });

        return true;
    }

    if (command === "send-appeal") {
        (GetGuild(true).channels.cache.get("1014272383932186656") as TextChannel)
            .send({
                embeds: [
                    CreateEmbed(`**Welcome to Mester's Prison! You're probably here because want to appeal your ban.**`
                        + `\nAppealing your ban is easy: just click on this handy button!`)
                ],
                components: [
                    CreateAppealButton()
                ]
            });

        return true;
    }

    if (command === "send-selfroles") {
        (GetGuild().channels.cache.get(config.channels.SelfRoles) as TextChannel)
            .send({
                embeds: [
                    CreateEmbed(`**Feel free to pick any roles you want.\nThese roles give you access to certain pings or colors (well, that will come later)!**`)
                ],
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("selfroles.select")
                            .setMaxValues(1)
                            .setOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel("Ping for bot updates")
                                    .setEmoji({ name: "🤖" })
                                    .setValue("botupdate"),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel("Ping for announcements")
                                    .setEmoji({ name: "📢" })
                                    .setValue("announcement"),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel("Ping for giveaways")
                                    .setEmoji({ name: "💰" })
                                    .setValue("giveaway"),
                            )
                    )
                ]
            });

        return true;
    }
}

const conversations = new Map<string, { messages: openai.ChatCompletionRequestMessage[], last: number }>();

async function replyToConversation(message: Message) {
    // get the message content without the mention
    const content = message.content.slice(message.mentions.users.first().toString().length + 1).trim();
    if (content.length < 1) return;

    if (content === "reset") {
        conversations.delete(message.author.id);
        return message.reply("I've reset the conversation!");
    }

    // get the conversation
    let conversation = conversations.get(message.author.id);
    if (!conversation || (conversation.last - Date.now()) > 60_000 * 30)
        conversation = { messages: [{ content: SystemMessage, role: "system" }, { content, role: "user" }], last: Date.now() };
    else
        conversation.last = Date.now();

    const response = await openAIClient.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversation.messages
    });

    let reply = response.data.choices[0]?.message?.content;
    if (!reply) return message.reply("__An unexpected error has happened__");

    reply += `\nWarning: this is an experimental feature. It might say false information, especially about how to use the commands.`;

    // add the reply to the conversation
    conversation.messages.push({ content: reply, role: "assistant" });

    message.reply(reply);
}

export default MessageCreateEvent;