import { Events, Invite } from "discord.js";
import Event from "../types/Event.js";
import { invites } from "./guildMemberAdd.js";

const inviteDeleteEvent: Event = {
    name: Events.InviteDelete,

    async run(_, invite: Invite) {
        invites.delete(invite.code);
    }
};

export default inviteDeleteEvent;
