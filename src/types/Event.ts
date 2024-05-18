import { Client, Events } from "discord.js";

interface Event {
    /**
     * The name of the event (same as the Discord.JS event name)
     */
    name: Events;
    /**
     * The main function that executes when the event is run
     */
    // biome-ignore lint/suspicious/noExplicitAny: <any is fine here, it'll be specified by the events>
    run: (client: Client, ...args: Array<any>) => Promise<void>;
}

export default Event;
