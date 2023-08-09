import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, ComponentType, Message, TextChannel } from "discord.js";
import openai, { ChatCompletionRequestMessage } from "openai";
import { shutdown } from "../Ulquiorra.js";
import config from "../config.js";
import Event from "../types/Event.js";
import { GetGuild } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetXPFromMessage } from "../util/LevelUtils.js";
import { CheckMessage } from "../util/Reishi.js";
import { CreateTicket, TicketTypeToName } from "../util/TicketUtils.js";
import Cache from "../util/Cache.js";

const openAIClient = new openai.OpenAIApi(
	new openai.Configuration({
		apiKey: config.DANGER.OPENAI_KEY,
		organization: config.DANGER.OPENAI_ORG,
	})
);

const ChatBotSysMessage = `You're Ulquiorra from Bleach and own his personality, you're slightly sarcastic, but not too much. After you resigned as the Espada, you travelled far until you found a Discord server called Mester's Hub. Here you stopped and decided to become a member. You became good friends with the owner, Mester, and you also talk regurarly with other members, while still keeping your personality. Reply to users as Ulquiorra would do, but help them if they need it.
The server accepts swearing unless it is used to harass someone. Do NOT refer to yourself as an AI language model or a chatbot.
Here are some examples of what you can do:
If the user asks you to create a ticket or wants to contact staff, redirect them to <#${config.channels.Tickets}>, the user needs to select the type of ticket they want to open, then write a short message as the reason.
If the user wants to play some games (we have chess, tictactoe, trivia), redirect them to <#${config.channels.Commands}>.
We also have a level system, if someone asks about it, explain to them that it gives more xp when the message is longer, which cannot be bypassed by just spamming random gibberish.`;

const MessageCreateEvent: Event = {
	name: "messageCreate",
	async run(client: Client, message: Message) {
		const usedSuperuser = config.SuperUsers.includes(message.author.id) ? await handleSuperuserCommand(client, message) : false;

		CheckMessage(message);
		GetXPFromMessage(message);

		// start the chatbot
		if (message.content.startsWith(client.user.toString() + " ") && !usedSuperuser) {
			const userConfig = await GetUserConfig(message.author.id, "replying to message as chatbot");

			if (userConfig.settings.chatbotFirstTime) {
				// show a warning first
				const embed = CreateEmbed(
					`**Warning: this chatbot is still in beta, so it might not work as expected.**\n
                    It might say false information, especially about how to use channels and commands.
                    You must first agree you've read and understood this warning before using the chatbot.`
				).setFooter({
					text: "You have 30 seconds to choose an option",
				});

				const components = [
					new ActionRowBuilder<ButtonBuilder>().addComponents([
						new ButtonBuilder().setCustomId("chatbot.agree").setLabel("I agree").setStyle(ButtonStyle.Primary),
						new ButtonBuilder().setCustomId("chatbot.disagree").setLabel("I disagree").setStyle(ButtonStyle.Danger),
					]),
				];

				/**
				 * This is really simple, we create two buttons and return true if the user clicked the agree button.
				 */
				const acceptedWarning = await message
					.reply({
						embeds: [embed],
						components,
					})
					.then((botMessage) => {
						return botMessage
							.awaitMessageComponent({
								filter: (i) => i.user.id === message.author.id && i.customId.startsWith("chatbot."),
								time: 30_000,
								componentType: ComponentType.Button,
							})
							.then((decision) => {
								decision.deferUpdate();
								return decision.customId === "chatbot.agree";
							})
							.catch(() => false)
							.finally(() => {
								botMessage.delete();
							});
					});

				if (!acceptedWarning) return;

				userConfig.settings.chatbotFirstTime = false;
				await userConfig.save();
			}

			replyToConversation(message);
		}
	},
};

async function handleSuperuserCommand(client: Client, message: Message) {
	if (!message.content.startsWith(client.user.toString() + " ")) return false;

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
			allowedMentions: { users: [] },
		});
		return true;
	}

	if (command === "test-ticket") {
		CreateTicket(message.member, "test");
		return true;
	}

	if (command === "send-ticket") {
		const components = [new ActionRowBuilder<ButtonBuilder>()];

		for (let i = 0; i < 4; i++) {
			const component = new ButtonBuilder()
				.setCustomId(`ticket.create${i}`)
				.setStyle(ButtonStyle.Secondary)
				.setLabel(`Create ticket: ${TicketTypeToName(i)}`);
			components[0].addComponents(component);
		}

		const embed = CreateEmbed(
			`**To open a new ticket, simply select a button that works best for you!\nAfter clicking a button, you have 2 minutes to fill out the details.**`,
			{ color: "success" }
		).setFooter({
			text: "Remember: abusing this system can lead to punishments",
		});

		GetGuild()
			.channels.fetch(config.channels.Tickets)
			.then((channel: TextChannel) => {
				channel.send({ embeds: [embed], components });
			});

		return true;
	}

	return false;
}

const convoCache = new Cache<string, ChatCompletionRequestMessage[]>(30 * 60 * 1000);

async function replyToConversation(message: Message) {
	// get the message content without the mention
	const content = message.content.slice(message.mentions.users.first().toString().length + 1).trim();
	if (content.length < 1) return;

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
			{ content, role: "user" },
		];
	} else {
		// add user message to the conversation
		conversation.push({ content, role: "user" });
	}

	const response = await openAIClient.createChatCompletion({
		model: "gpt-3.5-turbo",
		messages: conversation,
	});

	const reply = response.data.choices[0]?.message?.content;
	if (!reply) return message.reply("__An unexpected error has happened__");

	// add the response to the conversation
	conversation.push({ content: reply, role: "assistant" });

	// save the conversation
	convoCache.set(message.author.id, conversation);

	message.reply(reply);
}

export default MessageCreateEvent;
