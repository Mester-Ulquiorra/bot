import { Events, Invite } from "discord.js";
import Event from "../types/Event.js";
import { invites } from "./guildMemberAdd.js";

const inviteCreateEvent: Event = {
    name: Events.InviteCreate,

    async run(_, invite: Invite) {
        invites.set(invite.code, invite.uses ?? 0);
    }
};

export default inviteCreateEvent;
