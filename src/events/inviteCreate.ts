import { Invite } from "discord.js";
import Event from "../types/Event.js";
import { invites } from "./guildMemberAdd.js";

const inviteCreateEvent: Event = {
    name: "inviteCreate",

    async run(client, invite: Invite) {
        invites.set(invite.code, invite.uses ?? 0);
    }
};

export default inviteCreateEvent;
