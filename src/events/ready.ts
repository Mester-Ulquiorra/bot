import { Client } from "discord.js";
import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import Event from "../types/Event.js";
import AutoUnpunish from "../util/AutoUnpunish.js";
import { GetGuild } from "../util/ClientUtils.js";
import ServerStats from "../util/ServerStats.js";
import { invites } from "./guildMemberAdd.js";

const ReadyEvent: Event = {
    name: "ready",

    async run(client: Client) {
        // fetch the guild and its channels (make sure that fetchMe is blocking, because it's important)
        await Promise.all([client.guilds.fetch(config.GuildId), GetGuild().members.fetchMe(), GetGuild().channels.fetch()]);

        AutoUnpunish();
        ServerStats();

        // fetch the invites
        GetGuild()
            .invites.fetch()
            .then((guildInvites) => {
                for (const guildInvite of guildInvites.map((i) => i)) {
                    invites.set(guildInvite.code, guildInvite.uses ?? 0);
                }
            });

        logger.log(`Successfully logged in as ${client.user?.tag}!`);
        console.timeEnd("Boot");
    }
};

export default ReadyEvent;
