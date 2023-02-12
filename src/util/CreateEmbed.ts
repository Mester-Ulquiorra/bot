import { ColorResolvable, EmbedBuilder, GuildMember, User } from "discord.js";

export enum EmbedColor {
    Info = "info",
    Success = "success",
    Warning = "warning",
    Error = "error"
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
    switch (color) {
        case EmbedColor.Info: return [12, 27, 21];
        case EmbedColor.Success: return [22, 137, 101];
        case EmbedColor.Warning: return [252, 186, 3];
        case EmbedColor.Error: return [237, 56, 36];
    }
}

/**
 * Function for creating a universal embed with extra options
 * @param description The description field of the embed
 * @param options Extra options for the embed, including the author field, color and title
 * @returns The EmbedBuilder object that can be used for post-processing or sending right away
 */
export default function (description: string, options: EmbedOptions = {}) {
    const embed = new EmbedBuilder()
        .setDescription(description)
        .setColor(getColor(options?.color ?? EmbedColor.Info));

    if (options.title) embed.setTitle(options.title);

    if (options.author)
        embed.setAuthor({
            name: options.author instanceof GuildMember ? options.author.user.tag : options.author.tag,
            iconURL: options.author.displayAvatarURL()
        });

    return embed;
}