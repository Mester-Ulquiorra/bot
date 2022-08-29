import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, codeBlock, GuildMember, User } from "discord.js";
import PunishmentConfig from "../database/PunishmentConfig";
import SlashCommand from "../types/SlashCommand";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed from "../util/CreateEmbed";

const UserInfoCommand: SlashCommand = {
	name: "userinfo",

	async run(interaction: ChatInputCommandInteraction, _client: Client) {
		let target: GuildMember | User = interaction.options.getMember("member") as GuildMember;
		if (!target) target = interaction.options.getUser("member");
		if (!target) return "Member was not found";

		const targetConfig = await GetUserConfig(target.id);

		// get the member's roles
		const targetRoles = target instanceof GuildMember
			? target.roles.cache
				// sort the roles so it represents the hierarchy
				.sort((a, b) => b.position - a.position)
				.map((r) => r.name)
				// remove @everyone
				.slice(0, target.roles.cache.size - 1)
				.join(", ")
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
				value: `<t:${targetConfig.firstjoined}>`,
				inline: true
			},
			{
				name: "Last joined at",
				value: `<t:${targetConfig.lastjoined}>`,
				inline: true
			},
			{
				name: "Roles",
				value: codeBlock(targetRoles)
			},
			{
				name: "Mod?",
				value: targetConfig.mod !== 0 ? `Yes (${targetConfig.mod})` : "No",
				inline: true
			},
			{
				name: "Has an active punishment?",
				value: latestPunishment == null ? `No` : `Yes (${latestPunishment.id})`,
				inline: true
			}
		]).setFooter({ text: `User ID: ${target.id} `});

		// create components
        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("punishmentinfo.showactivep")
                    .setLabel("View active punishment")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(latestPunishment == null ? true : false),
                new ButtonBuilder()
                    .setCustomId("punishmentinfo.showallp")
                    .setLabel("View all punishments")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel("Show avatar")
                    .setStyle(ButtonStyle.Link)
                    .setURL(target instanceof GuildMember ? target.displayAvatarURL({ extension: "png" }) : target.avatarURL({ extension: "png" }))
            ).toJSON(),
        ];

        // send the embed
        interaction.reply({
            embeds: [embed],
            components: components as Array<APIActionRowComponent<any>>,
            ephemeral: true,
        });
	}
}

export default UserInfoCommand;