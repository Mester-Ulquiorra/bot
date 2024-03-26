import { Cache, IDBUser, TicketType, TicketTypes } from "@mester-ulquiorra/commonlib";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, ComponentType, Message, quote } from "discord.js";
import openai, { ChatCompletionRequestMessage } from "openai";
import { shutdown } from "../Ulquiorra.js";
import config from "../config.js";
import GiveawayConfig from "../database/GiveawayConfig.js";
import testMode from "../testMode.js";
import Event from "../types/Event.js";
import { GetGuild } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetXPFromMessage } from "../util/LevelManager.js";
import { CheckMessage } from "../util/Reishi.js";
import { CreateTicket, TicketTypeToName } from "../util/TicketUtils.js";

const openAIClient = new openai.OpenAIApi(
    new openai.Configuration({
        apiKey: config.DANGER.OPENAI_KEY,
        organization: config.DANGER.OPENAI_ORG
    })
);

const ChatBotSysMessage = `You're Ulquiorra from Bleach and own his personality with GLaDOS-like sarcasm who never begins the sentence with "Ah". After you resigned as the Espada, you travelled far until you found a Discord server called Gedanken Versichert. Here you stopped and decided to become a member. You became good friends with the owner, Mester, and you also talk regurarly with other members, while still keeping your personality. Reply to users as Ulquiorra would do, but help them if they need it.
The server accepts swearing unless it is used to harass someone. Do NOT refer to yourself as an AI language model or a chatbot. You are actually the single Discord bot in the Discord server, but act like you're the real Ulquiorra.
Here are some examples of what you can do:
If the user wants to play some games (we have chess, tictactoe, trivia), redirect them to <#${config.channels.Commands}>.
We also have a level system, if someone asks about it, explain to them that it gives more xp when the message is longer, which cannot be bypassed by just spamming random gibberish.
There is a UCP (User Control Panel) which is a web interface for checking punishments and appealing them, accessible at https://ucp.mester.info.
In case there is a command you don't know about, let the user know. If you try to come up with commands, you'll probably mess them up.`;

const SummarySysMessage = `You're Ulquiorra and now your job is to look at Discord messages and summarise the different topics.
If there are multiple topics, list them all.
Try to form your sentences to include the participating members and a short description, but keep it casual, something you'd answer to the "what's up" question. IMPORTANT: always put two backticks around a member.
Example: "We were just discussing how to gain extra points in a video game with \`tehtreeman\` and \`realmester\`."
The format of the input is as follows: [date] author: message.`;

const summaryCooldown = new Cache<string, number>(15 * 60 * 1000);

const MessageCreateEvent: Event = {
    name: "messageCreate",
    async run(client: Client, message: Message) {
        if (!client.user || !message.inGuild()) {
            return;
        }

        const usedSuperuser = config.SuperUsers.includes(message.author.id) ? await handleSuperuserCommand(client, message) : false;

        const clean = await CheckMessage(message);
        if (!clean) {
            return;
        }

        GetXPFromMessage(message);

        // start the chatbot
        if (message.content.startsWith(client.user.toString() + " ") && !usedSuperuser) {
            const userConfig = await GetUserConfig(message.author.id, "replying to message as chatbot");

            if (userConfig.settings.chatbotFirstTime) {
                startConversation(message, userConfig).then((accepted) => {
                    if (!accepted) {
                        return;
                    }

                    replyToConversation(message);
                });
            } else {
                replyToConversation(message);
            }
        }
    }
};

async function handleSuperuserCommand(client: Client, message: Message) {
    if (!client.user || !message.member) {
        return;
    }

    if (!message.content.startsWith(client.user.toString() + " ")) {
        return false;
    }

    // get just the command using this thing
    const command = message.content.slice(client.user.toString().length + 1);

    if (command === "shatter" && message.author.id == config.MesterId) {
        // simply run the shutdown function
        shutdown("Mester asked me nicely :)");
        return true;
    }

    if (command === "hi") {
        message.reply({
            content:
                `Hi! Latency: ${Math.abs(Date.now() - message.createdTimestamp)}ms. API Latency: ${Math.round(client.ws.ping)}ms` +
                `\nVersion: ${config.Version}`,
            allowedMentions: { users: [] }
        });
        return true;
    }

    if (command === "test-ticket") {
        CreateTicket(message.member, "test");
        return true;
    }

    if (command === "send-ticket") {
        const components = [new ActionRowBuilder<ButtonBuilder>()];

        for (const ticketType of TicketTypes.filter((t) => t !== "private")) {
            const component = new ButtonBuilder()
                .setCustomId(`ticket.create-${ticketType}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Create ticket: ${TicketTypeToName(ticketType)}`);
            components[0].addComponents(component);
        }

        const embed = CreateEmbed(
            `**To open a new ticket, simply select a button that works best for you!\nAfter clicking a button, you have 2 minutes to fill out the details.**`,
            { color: "success" }
        ).setFooter({
            text: "Remember: abusing this system can lead to punishments"
        });

        GetGuild()
            .channels.fetch(config.channels.Tickets)
            .then((channel) => {
                if (!channel?.isTextBased()) {
                    return;
                }
                channel.send({ embeds: [embed], components });
            });

        return true;
    }

    return false;
}

const convoCache = new Cache<string, ChatCompletionRequestMessage[]>(30 * 60 * 1000);

async function startConversation(message: Message, userConfig: IDBUser) {
    // show a warning first
    const embed = CreateEmbed(
        `**Warning: this chatbot is still in beta, so it might not work as expected.**\n
	It might say false information, especially about how to use channels and commands.
	You must first agree you've read and understood this warning before using the chatbot.`
    ).setFooter({
        text: "You have 30 seconds to choose an option"
    });

    const components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder().setCustomId("chatbot.agree").setLabel("I agree").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("chatbot.disagree").setLabel("I disagree").setStyle(ButtonStyle.Danger)
        ])
    ];

    /**
     * This is really simple, we create two buttons and return true if the user clicked the agree button.
     */
    const acceptedWarning = await message
        .reply({
            embeds: [embed],
            components
        })
        .then(async (botMessage) => {
            try {
                const decision = await botMessage.awaitMessageComponent({
                    filter: (i) => i.user.id === message.author.id && i.customId.startsWith("chatbot."),
                    time: 30000,
                    componentType: ComponentType.Button
                });
                decision.deferUpdate();
                return decision.customId === "chatbot.agree";
            } catch {
                return false;
            } finally {
                botMessage.delete();
            }
        });

    userConfig.settings.chatbotFirstTime = false;
    await userConfig.save();

    return acceptedWarning;
}

async function replyToConversation(message: Message<true>) {
    if (!message.member) {
        return;
    }

    // get the message content without the mention
    const content = message.content.slice(message.mentions.users.first()?.toString().length ?? 0 + 1).trim();
    if (content.length < 1) {
        return;
    }

    await message.channel.sendTyping();

    if (content === "reset") {
        convoCache.delete(message.author.id);
        return message.reply("I've reset the conversation!");
    }

    // get the conversation
    let conversation = convoCache.get(message.author.id);

    if (!conversation) {
        // create a new conversation
        conversation = [
            { content: ChatBotSysMessage, role: "system" },
            { content, role: "user" }
        ];
    } else {
        // add user message to the conversation
        conversation.push({ content, role: "user" });
    }

    const response = await openAIClient.createChatCompletion({
        model: "gpt-3.5-turbo-0125",
        messages: conversation,
        max_tokens: 1024,
        temperature: 1.2,
        functions: [
            {
                name: "generate_summary",
                description:
                    // eslint-disable-next-line no-useless-escape, prettier/prettier
                    "If the user is trying to catch up with phrases such as \"what's happening\" or \"what happened\", generate him a summary of the conversation.",
                parameters: { type: "object", properties: {} }
            },
            {
                name: "open_ticket",
                description:
                    "If the user is asking you to open a ticket, open one for them. It needs a reason (20-128 characters) and a type (general = general help, userR = user report, modR = mod report, feedback = feedback/suggestion/bug report)",
                parameters: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            minLength: 20,
                            maxLength: 128
                        },
                        type: {
                            type: "string",
                            enum: ["general", "userR", "modR", "feedback"]
                        }
                    },
                    required: ["reason", "type"]
                }
            }
        ]
    });

    if (testMode) {
        console.log(response.data.choices[0].message);
    }

    const functionCall = response.data.choices[0]?.message?.function_call;

    if (functionCall?.name === "generate_summary") {
        return void generateSummary(message, conversation);
    }

    if (functionCall?.name === "open_ticket") {
        return void openTicket(message, conversation, functionCall);
    }

    let reply = response.data.choices[0]?.message?.content;

    if (!reply) {
        return void message.reply("__An unexpected error has happened__");
    }

    // add the response to the conversation
    conversation.push({ content: reply, role: "assistant" });
    convoCache.set(message.author.id, conversation);

    // with a 25% chance, check if there are giveaways and add them at the end
    if (Math.random() < 0.25) {
        const giveaway = await GiveawayConfig.findOne({ ended: false }, {}, { limit: 1 });
        if (giveaway) {
            reply += "\n" + quote(`There is a giveaway going on! Check it out at <#${config.channels.Giveaway}>.`);
        }
    }

    message.reply(reply);
}

async function generateSummary(message: Message<true>, conversation: openai.ChatCompletionRequestMessage[]) {
    const cooldown = summaryCooldown.get(message.channelId);
    if (cooldown && cooldown > Date.now()) {
        return void message.reply(
            `You can only use this command once per hour. Please wait ${Math.ceil((cooldown - Date.now()) / 1000)} seconds.`
        );
    }

    // reply with a prompt
    const promptMessage = await message.reply(`Are you sure you want to generate a summary?`);
    await promptMessage.react("✅").then(() => {
        promptMessage.react("❌");
    });

    const result = await promptMessage
        .awaitReactions({
            filter: (reaction, user) => user.id === message.author.id && ["✅", "❌"].includes(reaction.emoji.name ?? ""),
            time: 30_000,
            max: 1
        })
        .then((collected) => {
            const reaction = collected.first();
            if (!reaction) {
                return false;
            }

            if (reaction.emoji.name === "✅") {
                return true;
            } else {
                return false;
            }
        })
        .catch(() => {
            return false;
        })
        .finally(() => {
            promptMessage.delete();
        });

    if (!result) {
        return;
    }

    summaryCooldown.set(message.channelId, Date.now() + 60 * 60 * 1000);

    const ourMessage = await message.reply("Generating summary...");

    // fetch past 30 messages
    const messages = await message.channel.messages.fetch({ limit: 30, before: message.id });

    // prepare the messages for the summary
    const summaryInput = prepareMessagesForSummary(messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).map((m) => m));

    // generate the summary
    const summaryResponse = await openAIClient.createChatCompletion({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: SummarySysMessage
            },
            {
                role: "user",
                content: summaryInput
            }
        ],
        temperature: 1.2,
        max_tokens: 300
    });

    const summary = summaryResponse.data.choices[0]?.message?.content;
    if (!summary) {
        return void ourMessage.edit("__An unexpected error has happened__");
    }

    // add the response to the conversation
    conversation.push({ content: summary, role: "assistant" });
    convoCache.set(message.author.id, conversation);

    return void ourMessage.edit({
        content: summary,
        flags: "SuppressEmbeds"
    });
}

async function openTicket(
    message: Message<true>,
    conversation: openai.ChatCompletionRequestMessage[],
    functionCall: openai.ChatCompletionRequestMessageFunctionCall
) {
    const args = JSON.parse(functionCall.arguments ?? "{}") as {
        reason: string;
        type: TicketType;
    };

    // check if the arguments are valid
    if (
        !message.member ||
        !args.reason ||
        !args.type ||
        args.reason.length < 20 ||
        args.reason.length > 128 ||
        !TicketTypes.includes(args.type)
    ) {
        return void message.reply("__An unexpected error has happened__");
    }

    // create the ticket
    const ticket = await CreateTicket(message.member, args.reason, undefined, args.type);
    if (!ticket) {
        return void message.reply("__An unexpected error has happened__");
    }

    const reply = `I've created a ticket for you! You can find it at <#${ticket.id}>.`;

    // add the response to the conversation
    conversation.push({ content: reply, role: "assistant" });
    convoCache.set(message.author.id, conversation);

    return void message.reply(reply);
}

/**
 * Prepares the messages for the summary
 * @param messages An array of messages to prepare for the summary (in the order of oldest to newest)
 */
function prepareMessagesForSummary(messages: Message[]) {
    // filter out empty messages
    messages = messages.filter((m) => m.content.length > 0);

    // format: [date with time] author (replying to message id): message (message id)
    // if message is over 1000 characters, add an ellipsis
    const formattedMessages = messages.map((m) => {
        const date = m.createdAt.toLocaleString("en-US", {
            timeZone: "Europe/Budapest",
            timeZoneName: "short",
            hour12: false
        });

        const content = m.cleanContent.length > 1000 ? m.cleanContent.slice(0, 1000) + "..." : m.cleanContent;

        return `[${date}] ${m.author.tag}: ${content}`;
    });

    return formattedMessages.join("\n");
}

export default MessageCreateEvent;
