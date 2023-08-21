import { Message, MessageReaction } from "discord.js";
import config from "../../config.js";
import CreateEmbed from "../CreateEmbed.js";
import ManageRole from "../ManageRole.js";
import { PunishMessage } from "../Reishi.js";
import Cache from "../Cache.js";
import { GetUserConfig } from "../ConfigHelper.js";

type ProtectionDecision = "yes" | "no";

/**
 * A cache for storing protection decisions of users
 */
const protectionCache = new Cache<string, ProtectionDecision>(10 * 60 * 1000);

export default async function (message: Message<true>) {
	if(!message.member) return;
	
	if (
		(await ManageRole(message.member, config.roles.Friend, "Check")) ||
		(await ManageRole(message.member, config.roles.Protected, "Check"))
	)
		return false;

	// check if the message contains a mention with the protected role
	const protectedPings = [
		...new Set(message.mentions.members.map((member) => member).filter((member) => member.roles.cache.has(config.roles.Protected))),
	];

	if (protectedPings.length === 0) return false;

	// if there are more than 1 protected users pinged, just mute
	if (protectedPings.length >= 2) {
		PunishMessage(message, "ProtectedPing", {
			comment: `Pinged the following protected members: ${protectedPings.map((member) => member.toString()).join(", ")}`,
		});
		return true;
	}

	const now = Date.now();

	const user = protectedPings[0];
	const userConfig = await GetUserConfig(user.id, "checking if user has disabled protected ping delete");

	// check if the user has any fresh messages in the channels
	const freshMessages = (await message.channel.messages.fetch({ limit: 50 }))
		// messages in the last 10 minutes
		.filter((x) => now - x.createdTimestamp < 10 * 60 * 1000)
		// filter messages only from the pinged user
		.filter((x) => x.author.id === user.id)
		// collection to array
		.map((x) => x);

	if (freshMessages.length === 0) {
		PunishMessage(message, "ProtectedPing", {
			comment: `Pinged the following protected member: ${user}`,
			forceDelete: userConfig.settings.deleteProtectedMutes,
		});
		return true;
	}

	const protDecision = protectionCache.get(user.id);

	if (protDecision) {
		if (protDecision === "yes") {
			PunishMessage(message, "ProtectedPing", {
				comment: `Pinged the following protected member: ${user}`,
				forceDelete: userConfig.settings.deleteProtectedMutes,
			});
			return true;
		}
		return false;
	}

	// ask the user if they want to mute
	const inputMessage = await message.reply({
		embeds: [CreateEmbed(`${user}, should I mute for this?`)],
		allowedMentions: {
			repliedUser: false,
		},
	});

	inputMessage.react("✅").then(() => {
		inputMessage.react("❌");
	});

	return inputMessage
		.awaitReactions({
			max: 1,
			filter: (reaction, reactionUser) => reactionUser.id === user.id && ["✅", "❌"].includes(String(reaction.emoji.name)),
			time: 30_000,
		})
		.then((reactions) => {
			if(reactions.size === 0) return false;
			const reaction = reactions.first() as MessageReaction;

			if (reaction.emoji.name === "✅") {
				protectionCache.set(user.id, "yes");

				PunishMessage(message, "ProtectedPing", {
					comment: `Pinged the following protected member: ${user}`,
					forceDelete: userConfig.settings.deleteProtectedMutes,
				});
				return true;
			}

			protectionCache.set(user.id, "no");
			return false;
		})
		.catch(() => {
			PunishMessage(message, "ProtectedPing", {
				comment: `Pinged the following protected member: ${user}`,
				forceDelete: userConfig.settings.deleteProtectedMutes,
			});
			return false;
		})
		.finally(() => {
			inputMessage.delete();
		});
}
