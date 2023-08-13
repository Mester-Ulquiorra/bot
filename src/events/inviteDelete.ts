import { Invite } from "discord.js";
import Event from "../types/Event.js";
import { invites } from "./guildMemberAdd.js";

const inviteDelete: Event = {
	name: "inviteCreate",

	async run(client, invite: Invite) {
		invites.delete(invite.code);
	},
};

export default inviteDelete;
