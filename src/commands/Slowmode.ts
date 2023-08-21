import SlashCommand from "../types/SlashCommand.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import ConvertDuration from "../util/ConvertDuration.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { ModNameToLevel } from "../util/ModUtils.js";

const SlowmodeCommand: SlashCommand = {
	name: "slowmode",

	async run(interaction, _client) {
		if(!interaction.inGuild()) return "You must be in a server to do this";

		const userConfig = await GetUserConfig(interaction.user.id, "setting slowmode");
		if (userConfig.mod < ModNameToLevel("Head")) return GetError("Permission");

		// get the duration format and try to convert it
		const duration = ConvertDuration(interaction.options.getString("duration"));
		if (!duration || duration > 21600) return GetError("Duration");

		const channel = interaction.channel;
		if(!channel) return "Interaction doesn't have a channel?? wtf??";

		channel.edit({
			rateLimitPerUser: duration,
			reason: `Slowmode enabled by ${interaction.user.tag}`,
		});

		const embed = CreateEmbed(`${interaction.user} has set the slowmode to **${duration} seconds**`, { color: "success" });
		interaction.reply({ embeds: [embed] });
	},
};

export default SlowmodeCommand;
