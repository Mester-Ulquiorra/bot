import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonStyle, Client, Message, TextChannel } from "discord.js";
import config from "../config";
import Event from "../types/Event";
import { shutdown } from "../Ulquiorra";
import { GetGuild } from "../util/ClientUtils";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";
import { GetXPFromMessage } from "../util/LevelUtil";
import { CheckMessage } from "../util/Reishi";
import { CreateTicket, TicketTypeToName } from "../util/TicketUtils";

const HelpMessage =
    "**Our xp system works based on mathematical formulas.** \n\n When you send a message, its length is sent through this formula: \n `clamp(length * (1 + user's_current_level / 140), 0, maximum_xp_of_level)` \n\n The maximum xp of a level (aka. the xp cap) is calculated using the following formula: \n `clamp(2000 * (1 - user's_current_level / xp_cap_multiplier), 200, 2000)` \n\n The xp cap multiplier is `70 / (1 - 200 / 2000)` \n\n The xp it takes to reach a certain level is calculated using this formula: \n `floor(2000 + 5000 * (level - 1) * (1 + (min(1 - 0.005 * (level - 70), 1) * level - 1) / 35))` \n\n Nice, isn't it? \n\n **Special thanks to Finnegan for helping me with some of the math.** \n If you want to get a visual representation of the different formulas, here are the Desmos links: [[Level to XP]](https://www.desmos.com/calculator/966mlsftxg) - [[Length to XP]](https://www.desmos.com/calculator/lshbxdm5sn) - [[XP cap]](https://www.desmos.com/calculator/bdxwovexie)";

const MessageCreateEvent: Event = {
    name: "messageCreate",
    async run(client: Client, message: Message) {
        if (config.SUPER_USERS.includes(message.author.id))
            handleSuperuserCommand(client, message);

        // check if the message is the help command
        if (message.content === client.user.toString() + " " + "help") {
            message.author.send({
                embeds: [
                    CreateEmbed(HelpMessage, {
                        title: `How the xp system on ${message.guild.name} works in 2 minutes:`,
                        color: EmbedColor.Success,
                    }),
                ],
            });
        }
            
        // only continue to xp if the message is not blocked by Reishi
        if (!(await CheckMessage(message, client))) return;

        GetXPFromMessage(message);
    }
}

async function handleSuperuserCommand(client: Client, message: Message) {
    if (!message.content.startsWith(client.user.toString() + " ")) return;

    // get just the command using this thing
    const command = message.content.slice(client.user.toString().length + 1);

    if (command === "shatter" && message.author.id == config.MESTER_ID)
        // simply run the shutdown function
        shutdown("Mester asked me nicely :)");

    if (command === "hi")
        message.reply({
            content: `Hi! Latency: ${Math.abs(Date.now() - message.createdTimestamp)}ms. API Latency: ${Math.round(client.ws.ping)}ms`
                + `\nVersion: ${config.VERSION}`,
            allowedMentions: { users: [] },
        });

    if (command === "ticket-test") {
        CreateTicket(message.member, "test");
    }

    if (command === "ticket-send") {
        let components = new ActionRowBuilder();

        for (let i = 0; i < 4; i++) {
            const component = new ButtonBuilder()
                .setCustomId(`ticket.create${i}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Create ticket: ${TicketTypeToName(i)}`);
            components.addComponents([component]);
        }

        const embed = CreateEmbed(
            `**To open a new ticket, simply select a button that works best for you!\nAfter clicking a button, you have 2 minutes to fill out the details.**`,
            { color: EmbedColor.Success },
        ).setFooter({ text: "Remember: abusing this system can lead to punishments" })

        GetGuild().channels.fetch("812699682391457812").then((channel: TextChannel) => {
            channel.send({ embeds: [embed], components: [components.toJSON() as APIActionRowComponent<any>] });
        });
    }

    if (command === "verify-send") {
        const components = [
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId("verify")
                    .setLabel("Verify!")
                    .setStyle(ButtonStyle.Primary),
            ]).toJSON() as APIActionRowComponent<any>
        ];

        const embed = CreateEmbed(
            `**In order to access the rest of the server, you must verify yourself first.\nThis is to prevent bots from accessing the server and potentially causing harm.**\n\nVerifying yourself is stupidly easy, just click on the button, complete the captcha sent in dms, and you're good to go.`,
            {
                title: "Verify yourself",
                color: EmbedColor.Success,
            }
        ).setFooter({ text: "Watch out, there's a 2 minute cooldown!" });

        const verifyChannel = await GetGuild().channels.fetch("1006077960584970280") as TextChannel;

        verifyChannel.send({ embeds: [embed], components });
    }
};

export default MessageCreateEvent;