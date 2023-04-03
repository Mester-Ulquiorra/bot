import { ColorResolvable, EmbedBuilder, GuildMember, User } from "discord.js";

export const EmbedColor: {
    [key in "Info" | "Success" | "Warning" | "Error"]: ColorResolvable
} = {
    Info: [12, 27, 21],
    Success: [22, 137, 101],
    Warning: [252, 186, 3],
    Error: [237, 56, 36]
};

interface EmbedOptions {
    color?: ColorResolvable,
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
        .setColor(options?.color ?? EmbedColor.Info);

    if (description) embed.setDescription(description);

    if (options.title) embed.setTitle(options.title);

    if (options.author)
        embed.setAuthor({
            name: options.author instanceof GuildMember ? options.author.user.tag : options.author.tag,
            iconURL: options.author.displayAvatarURL()
        });

    return embed;
}