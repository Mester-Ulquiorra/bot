import { Client } from "discord.js";

interface Event {
    /**
     * The name of the event (same as the Discord.JS event names)
     */
    name: string;
    /**
     * The main function that executes when the event is run
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    run: (client: Client, ...args: Array<any>) => Promise<void>;
}

export default Event;
