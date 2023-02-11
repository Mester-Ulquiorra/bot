import { Client } from "discord.js";
import Log, { LogType } from "../util/Log.js";

interface Event {
    /**
     * The name of the event (same as the Discord.JS event names)
     */
    name: string,
    /**
     * The main function that executes when the event is run
     */
    run: (client: Client, ...args: Array<object>) => Promise<void>
}

export function EventInvoker(event: Event, client: Client, ...args: Array<object>) {
    event.run(client, ...args)
        .catch((err) => {
            Log(`Unexpected error in ${event.name} event\n${err.stack}`, LogType.Error);
        });
}

export default Event;