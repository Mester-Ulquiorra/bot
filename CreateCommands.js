const { SlashCommandBuilder } = require("discord.js");

const commands = [];

commands.push(
	new SlashCommandBuilder()
		.setName("unban")
		.setDescription("Unban a member")
		.addUserOption(option =>
			option
				.setName("member")
				.setDescription("The member to unban")
				.setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName("reason")
				.setDescription("The reason of the unban")
				.setRequired(false)
		)
)

commands.push(
	new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("View the server's rank leaderboard")
		.addIntegerOption(option =>
			option
				.setName("page")
				.setDescription("The page to view")
				.setMinValue(1)
				.setRequired(false)
		)
)

commands.push(
	new SlashCommandBuilder()
		.setName("rank")
		.setDescription("Show your or another member's rank")
		.addUserOption(option =>
			option
				.setName("member")
				.setDescription("The member whose rank you want to see")
				.setRequired(false)
		)
)

commands.push(
	new SlashCommandBuilder()
		.setName("xp")
		.setDescription("Manage someone's rank")
		.addSubcommand(subcommand =>
			subcommand
				.setName("add")
				.setDescription("Add xp/level to someone")
				.addUserOption(option =>
					option
						.setName("member")
						.setDescription("The member to manage")
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName("value")
						.setDescription("The value for the command (put an \"L\" at the end to mark it as a level)")
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("set")
				.setDescription("Set someone's xp/level")
				.addUserOption(option =>
					option
						.setName("member")
						.setDescription("The member to manage")
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName("value")
						.setDescription("The value for the command (put an \"L\" at the end to mark it as a level)")
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName("remove")
				.setDescription("Remove xp/level from someone")
				.addUserOption(option =>
					option
						.setName("member")
						.setDescription("The member to manage")
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName("value")
						.setDescription("The value for the command (put an \"L\" at the end to mark it as a level)")
						.setRequired(true)
				)
		)
)

commands.map(command => command.toJSON())
for (const command of commands) {
	console.log(JSON.stringify(command));
}