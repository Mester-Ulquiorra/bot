import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import SlashCommand, { SlashCommandReturnValue } from "../types/SlashCommand.js";
import GetError from "../util/GetError.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import { CanManageUser } from "../util/ModUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";

const BirthdayCommand: SlashCommand = {
	name: "birthday",

	async run(interaction, client) {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case "set": {
				return setBirthday(interaction);
			}
			case "get": {
				return getBirthday(interaction);
			}
		}
	},
};

const birthdayRegex = /^(?:((?:19|20)\d{2})-)?(0[1-9]|1[0-2])-([0-2][1-9]|3[0-1])$/m;

async function setBirthday(interaction: ChatInputCommandInteraction): SlashCommandReturnValue {
	const target = interaction.options.getMember("member") as GuildMember;
	if (!target) return GetError("UserUnavailable");

	const targetConfig = await GetUserConfig(target.id, "setting birthday of the user");
	const userConfig = await GetUserConfig(interaction.user.id, "setting birthday of a user");
	if (!CanManageUser(userConfig, targetConfig) && userConfig.mod === 0) return GetError("BadUser");

	const birthday = interaction.options.getString("birthday");

	if (birthday) {
		if (!birthdayRegex.test(birthday)) return GetError("BadValue", "birthday");

		const match = birthday.match(birthdayRegex);
		console.log(match);
		const year = parseInt(match[1]) ?? 0;
		const month = match[2];
		const day = match[3];

		targetConfig.settings.birthday = {
			year,
			day: `${month}-${day}`,
		};
	} else {
		targetConfig.settings.birthday = {
			year: 0,
			day: "",
		};
	}

	await targetConfig.save();

	const embedDescription = birthday
		? `Successfully set ${target}'s birthday to ${birthday}`
		: `Successfully removed ${target}'s birthday`;

	const embed = CreateEmbed(embedDescription, { color: "success" });
	await interaction.reply({ embeds: [embed] });
}

async function getBirthday(interaction: ChatInputCommandInteraction): SlashCommandReturnValue {
	const target = interaction.options.getUser("member");

	const targetConfig = await GetUserConfig(target.id, "getting birthday of the user");

	const birthday = targetConfig.settings.birthday;
	if (!birthday?.day) return "User doesn't have a birthday set!";

	// convert mm-dd to month day
	const month = birthday.day.split("-")[0];
	const day = birthday.day.split("-")[1];

	// add year
	const year = birthday.year ? birthday.year.toString() + "-" : "";

	console.log(year, month, day);

	const embed = CreateEmbed(`${target}'s birthday is ${year}${month}-${day}`);
	await interaction.reply({ embeds: [embed] });
}

export default BirthdayCommand;
