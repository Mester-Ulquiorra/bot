import { EmbedBuilder, GuildMember } from "discord.js";
import SlashCommand from "../types/SlashCommand";
import CreateEmbed from "../util/CreateEmbed";
import { GetLevelConfig, LevelToXP, XPToLevelUp } from "../util/LevelUtil";

const RankCommand: SlashCommand = {
    name: "rank",

    async run(interaction, _client) {
        // get the member (might be null, if it is, we need to get the rank information of the user)
        const member = interaction.options.getUser("member");

        // get level config
        const levelConfig = await GetLevelConfig(member ? member.id : interaction.user.id);

        // create the embed
        const embed = CreateEmbed(`Level information of <@${levelConfig.id}>`, {
            author: member ? member : interaction.member as GuildMember,
        });

        // add the fields
        AddRankFieldEmbeds(embed, levelConfig);

        interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

/**
 * A function used to add fields to an embed containing a member's level information.
 * @param {EmbedBuilder} embed The embed to add the fields to.
 * @param {any} levelConfig The level config to get the information from.
 */
export function AddRankFieldEmbeds (embed: EmbedBuilder, levelConfig: any) {
    /**
     * The xp relative to the user's level.
     */
    const relativexp = levelConfig.xp - LevelToXP(levelConfig.level);

    embed.addFields([
        {
            name: `Level (XP)`,
            value: `${levelConfig.level} (${relativexp})`,
            inline: true,
        },
        {
            name: `Total XP`,
            value: `${levelConfig.xp}`,
            inline: true,
        },
        {
            name: `XP until next level (%)`,

            // this weird part calculates the percentage of the xp until the next level
            value: `${XPToLevelUp(levelConfig.level) - relativexp} (${(
                (100 * relativexp) /
                XPToLevelUp(levelConfig.level)
            ).toFixed(2)}%)`,

            inline: true,
        },
    ]);
};

export default RankCommand;