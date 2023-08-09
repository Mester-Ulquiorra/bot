import { Client, MessageReaction, User } from "discord.js";
import Event from "../types/Event.js";

const messageReactionAddEvent: Event = {
	name: "messageReactionAdd",

	async run(client: Client, reaction: MessageReaction, user: User) {
		// check if reaction is the skull or skull with crossbones emoji
		if (reaction.emoji.name === "💀" || reaction.emoji.name === "☠️") {
			// remove reaction
			reaction.remove();
		}
	},
};

export default messageReactionAddEvent;
