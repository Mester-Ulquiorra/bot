import { DBLevel } from "@mester-ulquiorra/commonlib";
import { EmbedBuilder } from "discord.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { GetResFolder, browser } from "../Ulquiorra.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetLevelConfig, LevelToXP, XPToLevel, XPToLevelUp } from "../util/LevelUtils.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const htmlFilePath = path.join(GetResFolder(), "rank", "rankTemplate.html");

const RankCommand: SlashCommand = {
    name: "rank",

    async run(interaction, _client) {
        let user = interaction.options.getUser("member");
        if (!user) user = interaction.user;

        // get level config
        const levelConfig = await GetLevelConfig(user.id);

        if (interaction.options.getBoolean("textmode")) {
            // create the embed
            const embed = CreateEmbed(`Level rank of <@${levelConfig.userId}>`, {
                author: user,
            });

            // add the fields
            AddRankFieldEmbeds(embed, levelConfig);

            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: false });

        const userLevel = XPToLevel(levelConfig.xp);

        const relativexp = levelConfig.xp - LevelToXP(userLevel);
        const levelupPercent = relativexp / XPToLevelUp(userLevel);

        const page = await browser.newPage();

        // apparently we need to use Object.assign to not copy by reference.
        const destination = new URL(htmlFilePath, "file:");

        destination.searchParams.append("avatar", user.displayAvatarURL({ size: 256, extension: "png" }));
        destination.searchParams.append("progress", `Current XP: ${relativexp} (${(levelupPercent * 100).toFixed(2)}%)`);
        destination.searchParams.append("progressPercent", (levelupPercent * 100).toString());
        destination.searchParams.append("username", user.tag);
        destination.searchParams.append("totalXp", `Total XP: ${levelConfig.xp}`);
        destination.searchParams.append("currLevel", `Level ${userLevel}`);
        destination.searchParams.append("nextLevel", `Level ${userLevel + 1} (${XPToLevelUp(userLevel) - relativexp} XP left)`);

        await page.setViewport({ width: 1200, height: 300 });
        await page.goto(destination.toString(), { waitUntil: "networkidle0" });

        const buffer = await page.screenshot({ type: "jpeg" });

        interaction.editReply({
            files: [
                {
                    attachment: buffer,
                    name: "rank.jpeg"
                }
            ]
        }).then(() => {
            page.close();
        });
    }
};

/**
 * A function used to add fields to an embed containing a member's level information.
 * @param embed The embed to add the fields to.
 * @param levelConfig The level config to get the information from.
 */
export function AddRankFieldEmbeds(embed: EmbedBuilder, levelConfig: DBLevel) {
    const userLevel = XPToLevel(levelConfig.xp);

    /**
     * The xp relative to the user's level.
     */
    const relativexp = levelConfig.xp - LevelToXP(userLevel);

    embed.addFields([
        {
            name: `Level (XP)`,
            value: `${userLevel} (${relativexp})`,
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
            value: `${XPToLevelUp(userLevel) - relativexp} (${(
                (100 * relativexp) /
                XPToLevelUp(userLevel)
            ).toFixed(2)}%)`,

            inline: true,
        },
    ]);
}

export default RankCommand;

export { browser };

