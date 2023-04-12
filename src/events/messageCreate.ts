import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Message, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextChannel } from "discord.js";
import { shutdown } from "../Ulquiorra.js";
import config from "../config.js";
import Event from "../types/Event.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetXPFromMessage } from "../util/LevelUtils.js";
import { CreateAppealButton } from "../util/ModUtils.js";
import { CheckMessage } from "../util/Reishi.js";
import { CreateTicket, TicketTypeToName } from "../util/TicketUtils.js";

const MessageCreateEvent: Event = {
    name: "messageCreate",
    async run(client: Client, message: Message) {
        if (config.SuperUsers.includes(message.author.id))
            handleSuperuserCommand(client, message);

        // only continue to xp if the message is not blocked by Reishi
        CheckMessage(message).then((clean) => {
            if (!clean) return;
            GetXPFromMessage(message);
        });
    }
};

async function handleSuperuserCommand(client: Client, message: Message) {
    if (!message.content.startsWith(client.user.toString() + " ")) return;

    // get just the command using this thing
    const command = message.content.slice(client.user.toString().length + 1);

    if (command === "shatter" && message.author.id == config.MesterId)
        // simply run the shutdown function
        shutdown("Mester asked me nicely :)");

    if (command === "hi")
        message.reply({
            content: `Hi! Latency: ${Math.abs(Date.now() - message.createdTimestamp)}ms. API Latency: ${Math.round(client.ws.ping)}ms`
                + `\nVersion: ${config.Version}`,
            allowedMentions: { users: [] },
        });

    if (command === "test-ticket") {
        CreateTicket(message.member, "test");
    }

    if (command === "send-ticket") {
        const rawComponent = new ActionRowBuilder<ButtonBuilder>();

        for (let i = 0; i < 4; i++) {
            const component = new ButtonBuilder()
                .setCustomId(`ticket.create${i}`)
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Create ticket: ${TicketTypeToName(i)}`);
            rawComponent.addComponents([component]);
        }

        const components = [rawComponent.toJSON()];

        const embed = CreateEmbed(
            `**To open a new ticket, simply select a button that works best for you!\nAfter clicking a button, you have 2 minutes to fill out the details.**`,
            { color: "success" },
        ).setFooter({ text: "Remember: abusing this system can lead to punishments" });

        GetGuild().channels.fetch(config.channels.Tickets).then((channel: TextChannel) => {
            channel.send({ embeds: [embed], components });
        });
    }

    if (command === "send-verify") {
        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setCustomId("verify")
                    .setLabel("Verify!")
                    .setStyle(ButtonStyle.Primary),
            ]).toJSON()
        ];

        const embed = CreateEmbed(
            `**In order to access the rest of the server, you must verify yourself first.\nThis is to prevent bots from accessing the server and potentially causing harm.**\n\nVerifying yourself is stupidly easy, just click on the button, complete the captcha, and you're good to go.`,
            {
                title: "Verify yourself",
                color: "success",
            }
        ).setFooter({ text: "Watch out, there's a 30 seconds cooldown!" });

        const verifyChannel = await GetGuild().channels.fetch(config.channels.Verify) as TextChannel;

        verifyChannel.send({ embeds: [embed], components });
    }

    if (command === "send-appeal") {
        (GetGuild(true).channels.cache.get("1014272383932186656") as TextChannel)
            .send({
                embeds: [
                    CreateEmbed(`**Welcome to Mester's Prison! You're probably here because want to appeal your ban.**`
                        + `\nAppealing your ban is easy: just click on this handy button!`)
                ],
                components: [
                    CreateAppealButton()
                ]
            });
    }

    if (command === "send-selfroles") {
        (GetGuild().channels.cache.get(config.channels.SelfRoles) as TextChannel)
            .send({
                embeds: [
                    CreateEmbed(`**Feel free to pick any roles you want.\nThese roles give you access to certain pings or colors (well, that will come later)!**`)
                ],
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("selfroles.select")
                            .setMaxValues(1)
                            .setOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel("Ping for bot updates")
                                    .setEmoji({ name: "🤖" })
                                    .setValue("botupdate"),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel("Ping for announcements")
                                    .setEmoji({ name: "📢" })
                                    .setValue("announcement"),
                                new StringSelectMenuOptionBuilder()
                                    .setLabel("Ping for giveaways")
                                    .setEmoji({ name: "💰" })
                                    .setValue("giveaway"),
                            )
                    )
                ]
            });
    }
}

export default MessageCreateEvent;