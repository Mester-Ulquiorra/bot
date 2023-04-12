import { ColorResolvable, EmbedBuilder, GuildMember, User } from "discord.js";

export type EmbedColor = "info" | "success" | "warning" | "error";

export const EmbedColors: {
    [key in EmbedColor]: ColorResolvable
} = {
    info: [12, 27, 21],
    success: [22, 137, 101],
    warning: [252, 186, 3],
    error: [237, 56, 36]
};

interface EmbedOptions {
    color?: EmbedColor,
    title?: string,
    author?: GuildMember | User
}

/**
 * Function for creating a universal embed with extra options
 * @param description The description field of the embed
 * @param options Extra options for the embed, including the author field, color and title
 * @returns The EmbedBuilder object that can be used for post-processing or sending right away
 */
export default function (description: string, options: EmbedOptions = {}) {
    const embed = new EmbedBuilder()
        .setColor(EmbedColors[options?.color ?? "info"]);

    if (description) embed.setDescription(description);

    if (options.title) embed.setTitle(options.title);

    if (options.author)
        embed.setAuthor({
            name: options.author instanceof GuildMember ? options.author.user.tag : options.author.tag,
            iconURL: options.author.displayAvatarURL()
        });

    return embed;
}