import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionsBitField, TextChannel, User } from "discord.js";
import config from "../config.js";
import GiveawayConfig, { IDBGiveaway } from "../database/GiveawayConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { SnowFlake } from "../Ulquiorra.js";
import { GetGuild } from "../util/ClientUtils.js";
import ConvertDuration from "../util/ConvertDuration.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";

const GiveawayEmoji = "✅";

const GiveawayCommand: SlashCommand = {
    name: "giveaway",

    async run(interaction, _client) {
        switch (interaction.options.getSubcommand()) {
            case "start":
                return startGiveaway(interaction);
            case "end": {
                const giveaway = await GiveawayConfig.findOne({ giveawayId: interaction.options.getString("giveaway") });
                if (!giveaway)
                    return GetError("Database");

                if (giveaway.host !== interaction.user.id && !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator))
                    return GetError("Permission");

                endGiveaway(giveaway);
                interaction.deferReply().then(() => { interaction.deleteReply(); });
            }
        }
    }
};

async function startGiveaway(interaction: ChatInputCommandInteraction) {
    // check if member has Giveaway role
    if (!(interaction.member as GuildMember).roles.cache.has(config.GiveawayRole) && !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator))
        return GetError("Permission");

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator) && interaction.channelId !== config.GiveawayChannel)
        return `You can only use this command in <#${config.GiveawayChannel}>`;

    const name = interaction.options.getString("name");
    const duration = ConvertDuration(interaction.options.getString("duration"));
    if (isNaN(duration))
        return GetError("Duration");
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator) && duration < 600)
        return "The giveaway's duration must be at least 10 minutes";
    const winners = interaction.options.getInteger("winners") ?? 1;

    // we need to send the message first before creating the giveaway
    const end = Math.floor(Date.now() / 1000) + duration;
    const giveawayId = SnowFlake.getUniqueID().toString();

    const embed = CreateEmbed(`Giveaway hosted by ${interaction.user}!\nReach with ${GiveawayEmoji} to enter!`, {
        color: EmbedColor.Success,
        title: name
    })
        .addFields(
            {
                name: "Ends",
                value: `<t:${end}:R>`,
                inline: true
            },
            {
                name: "Winners",
                value: winners.toString(),
                inline: true
            }
        )
        .setFooter({ text: `Giveaway ID: ${giveawayId}` });

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    message.react(GiveawayEmoji);

    const giveaway = await GiveawayConfig.create({
        id: giveawayId,
        message: message.id,
        channel: message.channelId,
        name,
        host: interaction.user.id,
        start: Date.now(),
        end,
        winners,
    });

    Log(`${interaction.user.tag} (${interaction.user.id}) has created a new giveaway. ID: ${giveaway.id}`);
}

async function endGiveaway(giveaway: IDBGiveaway) {
    // get giveaway message
    const message = await (GetGuild().channels.cache.get(giveaway.channel) as TextChannel).messages.fetch(giveaway.message)
        .then((message) => { return message; })
        .catch(() => { return; });

    if (!message) {
        // this is weird
        giveaway.delete();
        return;
    }

    const users = (await message.reactions.cache.get(GiveawayEmoji).users.fetch())
        .filter(user => !user.bot)
        .map(user => user);

    giveaway.ended = true;

    if (users.length === 0 || !users) {
        // this is very unlikely to happen, but it's possible
        const embed = EmbedBuilder.from(message.embeds[0])
            .addFields({
                name: "Winners",
                value: "No winners :(",
                inline: false
            })
            .setColor([237, 56, 36]);

        // remove the "Ends" and "Winners" fields
        embed.data.fields.shift();
        embed.data.fields.shift();

        message.edit({ embeds: [embed] });
        message.reactions.removeAll();

        await giveaway.save();
        return;
    }

    const winners = getWinners(users, giveaway.winners);
    const lastWinner = winners[winners.length - 1].toString();
    const winnerString = winners.length > 1 ? winners
        // convert users into pingable string
        .map(user => user.toString())
        // get all winners except last
        .slice(0, -1)
        .join(", ") + ` and ${lastWinner}` : winners[0].toString();

    const embed = EmbedBuilder.from(message.embeds[0])
        .addFields({
            name: `Winners (${winners.length})`,
            value: winnerString,
            inline: false
        })
        .setColor([22, 137, 101]);

    // remove the "Ends" and "Winners" fields
    embed.data.fields.shift();
    embed.data.fields.shift();

    message.edit({ embeds: [embed] });
    message.reply(`**Congratulations to ${winnerString} for winning the giveaway!**`);

    await giveaway.save();
}

function getWinners(users: Array<User>, winners: number): Array<User> {
    if (users.length <= winners) return users;

    // split up the users into groups
    const groupSize = Math.floor(users.length / winners);

    const groups: User[][] = [];

    for (let i = 0; i < winners; i++) {
        if (i + 1 === winners) {
            groups.push(users);
            continue;
        }
        groups.push(users.slice(0, groupSize));
    }

    const groupWinners: User[] = [];

    for (const group of groups) {
        groupWinners.push(group[Math.floor(Math.random() * group.length)]);
    }

    return groupWinners;
}

// set up an interval to automatically end giveaways
setInterval(async () => {
    const giveaways = await GiveawayConfig.find({ ended: false, end: { $lte: Date.now() } }).sort({ start: 1 });

    for (const giveaway of giveaways) {
        endGiveaway(giveaway);
    }
}, 1000 * 60); // 1 minute

export default GiveawayCommand;