import { EmbedBuilder } from "discord.js";
import ConsoleCommand from "../types/ConsoleCommand.js";

/**
 * A map to hold every user the bot is waiting for.
 */
const waitingForResponse = new Map<string, boolean>();

const MessageConsoleCommand: ConsoleCommand = {
    name: "message",
    help: "message <userid> <message> - Sends a message to a user.",

    async run(args, client) {
        // check if args is empty or only 1 length
        if (args.length < 2) {
            console.log("Not enough arguments.");
            return;
        }

        // set userid to first argument
        const userid = args[0] as string;

        // set message by joining all other arguments
        const consoleMessage = args.slice(1).join(" ");

        // try to get the user
        const user = await client.users.fetch(userid);

        // if it doesn't exist, return
        if (!user) {
            console.log("User not found.");
            return;
        }

        // create embed
        const embed = new EmbedBuilder()
            .setTitle("Message from Console")
            .setDescription(consoleMessage)
            .setFooter({ text: "You have 1 minute to respond." });

        // send the message
        user.send({ embeds: [embed] })
            .then((message) => {
                console.log(`[Message] Message sent to ${user.tag}`);

                // check if user is waiting for a response
                if (waitingForResponse.has(userid))
                    // that's it, we're done
                    return;

                // set user to waiting for a response
                waitingForResponse.set(userid, true);

                const collector = message.channel.createMessageCollector({
                    filter: (m) => m.author.bot === false,
                    max: 1,
                    time: 60 * 1000,
                });

                console.log(`[Message] Waiting for response from ${user.tag}`);

                collector.on("collect", (m) => {
                    console.log(`[Message] Response from ${m.author.tag}: ${m.content}`);

                    // write out all the attachments
                    for (const [_, attachment] of m.attachments) {
                        console.log(`[Message] Message attachment from ${m.author.tag}: ${attachment.url}`);
                    }

                    // edit the message to show that they have responded
                    message.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("You've successfully responded!")
                                .setDescription(consoleMessage)
                                .setColor("#00ff00"),
                        ],
                    });

                    // remove user from waiting for a response
                    waitingForResponse.delete(m.author.id);
                });

                collector.on("end", (collected) => {
                    if (collected.size === 0) {
                        console.log(`[Message] ${user.tag} didn't respond.`);

                        // edit the message to show that they didn't respond
                        message.edit({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("You didn't respond.")
                                    .setDescription(consoleMessage)
                                    .setColor("#ff0000"),
                            ],
                        });
                    }

                    // check if user is still waiting for a response
                    if (waitingForResponse.has(userid))
                        // just delete them
                        waitingForResponse.delete(userid);
                });
            })
            .catch(() => {
                console.log("Failed to send message.");
            });
    }
};

export default MessageConsoleCommand;