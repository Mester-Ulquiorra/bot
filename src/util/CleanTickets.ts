import TicketConfig from "../database/TicketConfig.js";
import { GetGuild } from "./ClientUtils.js";
import Log, { LogType } from "./Log.js";

const TicketExpirationTime = 60 * 60 * 24; // 1 day

export default async function() {
    // get every closed ticket
    const tickets = await TicketConfig.find({ closed: true }).sort({
        closedat: 1,
    });

    // for each ticket
    for (const ticket of tickets) {

        // check if the ticket is expired
        if (
            Math.floor(Date.now() / 1000) - ticket.closedat <
            TicketExpirationTime
        )
            continue;

        try {
            // delete the channel using this handy one liner
            GetGuild().channels
                .fetch(ticket.channel)
                .then((channel) => {
                    channel.delete(`Ticket deleted - passed expiration time`);
                });

            ticket.delete();
        } catch(error) {
            Log(`Couldn't automatically delete ticket: ${error.stack}`, LogType.Warn);
        }
    }
}
