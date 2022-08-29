import { Client } from "discord.js";

export default interface ConsoleCommand {
    name: string,
    help?: string,
    run: (args: Array<any>, client: Client) => Promise<void>
}