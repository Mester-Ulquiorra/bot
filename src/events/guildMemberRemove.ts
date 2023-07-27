import { GuildMember } from "discord.js";
import config from "../config.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";

const GuildMemberRemoveEvent: Event = {
	name: "guildMemberRemove",

	async run(_client, member: GuildMember) {
		if (member.guild.id === config.PrisonId) return;

		// get member config
		const memberConfig = await GetUserConfig(member.id, "new member, leaving");

		// set inguild to false and mod to 0
		memberConfig.inguild = false;
		memberConfig.mod = 0;
		await memberConfig.save();

		// create the embed
		const embed = CreateEmbed(`**${member} has sadly left us today 😢**`)
			.addFields([
				{
					name: `Left at`,
					// set it to current time
					value: `<t:${Math.floor(Date.now() / 1000)}>`,
					inline: true,
				},
			])
			// set thumbnail to member's avatar
			.setThumbnail(member.user.displayAvatarURL())
			// set footer to member's id
			.setFooter({ text: `ID: ${member.id}` });

		// create the embed for logs
		const logEmbed = CreateEmbed(`${member} has left the server`)
			.addFields(
				{
					name: `Left at`,
					// set it to current time
					value: `<t:${Math.floor(Date.now() / 1000)}>`,
					inline: true,
				},
				{
					name: `Roles`,
					value:
						member.roles.cache.size > 1
							? member.roles.cache
									.map((role) => role.toString())
									.slice(0, -1)
									.join(", ")
							: "none",
					inline: false,
				}
			)
			.setThumbnail(member.displayAvatarURL());

		GetSpecialChannel("MiscLog").send({ embeds: [logEmbed] });
		GetSpecialChannel("Welcome").send({ embeds: [embed] });
	},
};

export default GuildMemberRemoveEvent;
