import { DBLevel, LevelToXP, XPToLevel, XPToLevelUp } from "@mester-ulquiorra/commonlib";
import { EmbedBuilder } from "discord.js";
import * as path from "path";
import { GetResFolder, browser } from "../Ulquiorra.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetLeaderboardPos, GetLevelConfig } from "../util/LevelManager.js";

const htmlFilePath = path.join(GetResFolder(), "rank", "index.html");

const RankCommand: SlashCommand = {
    name: "rank",

    async run(interaction) {
        if (!browser) {
            return "Puppeteer is not available, cannot render rank card.";
        }

        let user = interaction.options.getUser("member");
        if (!user) {
            user = interaction.user;
        }

        // get level config
        const levelConfig = await GetLevelConfig(user.id);

        if (interaction.options.getBoolean("textmode")) {
            // create the embed
            const embed = CreateEmbed(`Level rank of <@${levelConfig.userId}>`, {
                author: user
            });

            // add the fields
            AddRankFieldEmbeds(embed, levelConfig);

            return void interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: false });

        const userLevel = XPToLevel(levelConfig.xp);
        const relativexp = levelConfig.xp - LevelToXP(userLevel);
        const avatar = user.displayAvatarURL({ size: 256, extension: "png", forceStatic: true });
        const lbPos = await GetLeaderboardPos(levelConfig.userId);

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 300 });

        const destination = new URL(htmlFilePath, "file:");

        destination.searchParams.append("avatar", avatar);
        destination.searchParams.append("leaderboard", lbPos.toString());
        destination.searchParams.append("username", user.username);
        destination.searchParams.append("level", userLevel.toString());
        destination.searchParams.append("total", levelConfig.xp.toString());
        destination.searchParams.append("current", relativexp.toString());
        destination.searchParams.append("max", XPToLevelUp(userLevel).toString());

        await page.goto(destination.toString(), { waitUntil: "networkidle0" });

        const buffer = await page.screenshot({ type: "png" });

        interaction
            .editReply({
                files: [
                    {
                        attachment: buffer,
                        name: "rank.png"
                    }
                ]
            })
            .then(() => {
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
            inline: true
        },
        {
            name: `Total XP`,
            value: `${levelConfig.xp}`,
            inline: true
        },
        {
            name: `XP until next level (%)`,

            // this weird part calculates the percentage of the xp until the next level
            value: `${XPToLevelUp(userLevel) - relativexp} (${((100 * relativexp) / XPToLevelUp(userLevel)).toFixed(2)}%)`,

            inline: true
        }
    ]);
}

export default RankCommand;

export { browser };
