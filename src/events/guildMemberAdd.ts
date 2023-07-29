import { GuildMember } from "discord.js";
import config from "../config.js";
import Event from "../types/Event.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import ManageRole from "../util/ManageRole.js";

const GuildMemberAddEvent: Event = {
	name: "guildMemberAdd",

	async run(client, member: GuildMember) {
		// get the member config (doesn't matter if it didn't exist before)
		const memberConfig = await GetUserConfig(member.id, "new member");

		// set the lastjoined field to the current timestamp and inguild to true
		memberConfig.lastjoined = Math.floor(Date.now() / 1000);
		if (memberConfig.firstjoined === -1) memberConfig.firstjoined = memberConfig.lastjoined;
		memberConfig.inguild = true;
		await memberConfig.save();

		// check if the member is muted and if yes, add the role back
		if (memberConfig.muted) ManageRole(member, config.roles.Muted, "Add", "joined back as muted");

		// add the unverified role to the member
		ManageRole(member, config.roles.Unverified, "Add", "new member");

		// create the embed
		const embed = CreateEmbed(undefined)
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
		GetSpecialChannel("Welcome").send({
			content: `${member.user}, welcome to Mester's Hub! Please take a moment to verify yourself in <#${config.channels.Verify}> to unlock the rest of the server!`,
			embeds: [embed],
		});
	},
};

export default GuildMemberAddEvent;
