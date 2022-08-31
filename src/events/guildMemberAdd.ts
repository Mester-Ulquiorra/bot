import { GuildMember } from "discord.js";
import config from "../config";
import Event from "../types/Event";
import { GetSpecialChannel } from "../util/ClientUtils";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed from "../util/CreateEmbed";
import ManageRole from "../util/ManageRole";

const GuildMemberAddEvent: Event = {
	name: "guildMemberAdd",

	async run(_client, member: GuildMember) {
		if (member.guild.id === config.PRISON_ID) return;

		// get the member config (doesn't matter if it didn't exist before)
		const memberConfig = await GetUserConfig(member.id, "new member");

		// set the lastjoined field to the current timestamp and inguild to true
		memberConfig.lastjoined = Math.floor(Date.now() / 1000);
		memberConfig.inguild = true;
		await memberConfig.save();

		// check if the member is muted and if yes, add the role back
		if (memberConfig.muted) ManageRole(member, config.MUTED_ROLE, "Add", "joined back as muted");

		// create the embed
		const embed = CreateEmbed(`**Let's welcome our new member, ${member}!**`)
			.addFields([
				{
					// field for when the member joined
					name: `Joined at:`,
					value: `<t:${memberConfig.lastjoined}>`,
					inline: true,
				},
			])
			// set the thumbnail to the member's avatar
			.setThumbnail(member.user.displayAvatarURL())
			// set footer to the member's id
			.setFooter({ text: `ID: ${member.id}` });

		// get the welcome channel and send the embed
		GetSpecialChannel("Welcome").send({ embeds: [embed] });
	}
}

export default GuildMemberAddEvent