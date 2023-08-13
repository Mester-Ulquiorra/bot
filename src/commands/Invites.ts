import InviteConfig from "../database/InviteConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";

const invitesCommand: SlashCommand = {
	name: "invites",

	async run(interaction, client) {
		const user = interaction.options.getUser("user") ?? interaction.user;
		const invites = await InviteConfig.find({ userId: user.id });

		const totalUses = invites.reduce((acc, invite) => acc + invite.uses, 0);

		const embed = CreateEmbed(`**Invite statistics for ${user.tag}**`).addFields({
			name: "Total invites",
			value: totalUses.toString(),
		});

		interaction.reply({ embeds: [embed] });
	},
};

export default invitesCommand;