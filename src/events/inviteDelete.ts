import { Invite } from "discord.js";
import Event from "../types/Event.js";
import { invites } from "./guildMemberAdd.js";

const inviteDeleteEvent: Event = {
	name: "inviteDelete",

	async run(client, invite: Invite) {
		invites.delete(invite.code);
	},
};

export default inviteDeleteEvent;
