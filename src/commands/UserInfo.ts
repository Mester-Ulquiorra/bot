import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, GuildMember, User } from "discord.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetGuild } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
const UserInfoCommand: SlashCommand = {
    name: "userinfo",

    async run(interaction, client) {
        const target: GuildMember | User = (interaction.options.getMember("member") as GuildMember) || interaction.options.getUser("member");
        if (!target) return GetError("UserUnavailable");

        GenerateUserInfo(interaction, target);
    },

    async runButton(interaction, client) {
        const userId = interaction.customId.match(/userinfo\.showu-(\d+)/)[1];

        const target = (await GetGuild().members.fetch(userId)) || (await client.users.fetch(userId));
        GenerateUserInfo(interaction, target);
    }
};

async function GenerateUserInfo(interaction: ChatInputCommandInteraction | ButtonInteraction, target: GuildMember | User) {
    await interaction.deferReply({ ephemeral: true });
    const targetConfig = await GetUserConfig(target.id, null, true);

    if (!targetConfig) return "The user has never joined the server.";

    // get the member's roles
    const targetRoles = target instanceof GuildMember
        ? target.roles.cache
            // sort the roles so it represents the hierarchy
            .sort((a, b) => b.position - a.position)
            .map((r) => r.toString())
            // remove @everyone
            .slice(0, target.roles.cache.size - 1)
            .join(" ")
        : "Not found";

    const latestPunishment = await PunishmentConfig.findOne({
        user: target.id,
        active: true
    });

    const embed = CreateEmbed(`**Information about ${target}**`, {
        author: target
    }).addFields([
        {
            name: "Username (nickname)",
            // yeah, I know this looks terrible, but oh well
            value: (target instanceof GuildMember ? target.user.tag : target.tag) + (target instanceof GuildMember && target.nickname ? ` (${target.nickname})` : ""),
            inline: true
        },
        {
            name: "First joined",
            value: targetConfig.firstjoined === -1 ? "never" : `<t:${targetConfig.firstjoined}>`,
            inline: true
        },
        {
            name: "Last joined at",
            value: targetConfig.lastjoined === -1 ? "never" : `<t:${targetConfig.lastjoined}>`,
            inline: true
        },
        {
            name: "Roles",
            value: targetRoles
        },
        {
            name: "Mod?",
            value: targetConfig.mod !== 0 ? `Yes (${targetConfig.mod})` : "No",
            inline: true
        },
        {
            name: "Has an active punishment?",
            value: latestPunishment == null ? `No` : `Yes (${latestPunishment.punishmentId})`,
            inline: true
        }
    ]).setFooter({ text: `User ID: ${target.id}` });

    // create components
    const components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`punishmentinfo.showp-${latestPunishment?.punishmentId}`)
                .setLabel("View active punishment")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(latestPunishment == null ? true : false),
            new ButtonBuilder()
                .setCustomId(`punishmentinfo.showallp-${target.id}`)
                .setLabel("View all punishments")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setLabel("Show avatar")
                .setStyle(ButtonStyle.Link)
                .setURL((target instanceof GuildMember ? target.displayAvatarURL({ extension: "png" }) : target.avatarURL({ extension: "png" })) ?? "https://cdn.discordapp.com/embed/avatars/0.png")
        ).toJSON(),
    ];

    // send the embed
    interaction.editReply({
        embeds: [embed],
        components
    });
}

export default UserInfoCommand;