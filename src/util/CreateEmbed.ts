import { ColorResolvable, EmbedBuilder, GuildMember, User } from "discord.js";

export enum EmbedColor {
	Info = 0,
	Success = 1,
	Warning = 2,
	Error = 3
}

interface EmbedOptions {
	color?: EmbedColor,
	title?: string,
	author?: GuildMember | User
}

/**
 * Turn an EmbedColor enum into an RGB array
 */
function getColor(color: EmbedColor): ColorResolvable {
	switch(color) {
		case EmbedColor.Info: return [12, 27, 21];
		case EmbedColor.Success: return [22, 137, 101];
		case EmbedColor.Warning: return [252, 186, 3];
		case EmbedColor.Error: return [237, 56, 36];
	}
}

export default function(description: string, options: EmbedOptions = null) {
	const embed = new EmbedBuilder()
		.setDescription(description)
		.setColor(getColor(options?.color ?? EmbedColor.Info));

	if(options?.title != null) embed.setTitle(options.title);

	if(options?.author != null)
		embed.setAuthor({
			name: options.author instanceof GuildMember ? options.author.displayName : options.author.tag,
			iconURL: options.author.displayAvatarURL()
		});

	return embed;
}