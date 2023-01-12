import { EmbedBuilder, GuildMember } from "discord.js";
import { tmpdir } from "os";
import * as path from "path";
import * as puppeteer from "puppeteer";
import { fileURLToPath, pathToFileURL, URL } from "url";
import config from "../config.js";
import { DBLevel } from "../types/Database.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetLevelConfig, LevelToXP, XPToLevelUp } from "../util/LevelUtil.js";

const browser = await puppeteer.launch({
    userDataDir: path.join(tmpdir(), "puppeteer"),
});

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const htmlFile = pathToFileURL(path.join(__dirname, "..", "res", "rank", "rankTemplate.html"));

const RankCommand: SlashCommand = {
    name: "rank",

    async run(interaction, _client) {
        const user = interaction.options.getUser("member") || interaction.user;

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

        const relativexp = levelConfig.xp - LevelToXP(levelConfig.level);
        const levelupPercent = relativexp / XPToLevelUp(levelConfig.level);

        const page = await browser.newPage();

        const destination = htmlFile;
        destination.searchParams.append("avatar", user.displayAvatarURL({ size: 256, extension: "png" }));
        destination.searchParams.append("progress", `Current XP: ${relativexp} (${(levelupPercent * 100).toFixed(2)}%)`)
        destination.searchParams.append("progressPercent", (levelupPercent * 100).toString());
        destination.searchParams.append("username", user.tag);
        destination.searchParams.append("totalXp", `Total XP: ${levelConfig.xp}`);
        destination.searchParams.append("currLevel", `Level ${levelConfig.level}`);
        destination.searchParams.append("nextLevel", `Level ${levelConfig.level + 1} (${XPToLevelUp(levelConfig.level) - relativexp} XP left)`);

        await page.goto(destination.toString(), { waitUntil: "networkidle0" });
        await page.setViewport({ width: 1500, height: 300 });

        const buffer = await page.screenshot({ type: "png" });

        await page.close();

        interaction.editReply({
            files: [
                {
                    attachment: buffer,
                    name: "rank.png"
                }
            ]
        })
    }
};

/**
 * A function used to add fields to an embed containing a member's level information.
 * @param embed The embed to add the fields to.
 * @param levelConfig The level config to get the information from.
 */
export function AddRankFieldEmbeds(embed: EmbedBuilder, levelConfig: DBLevel) {
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

export { browser };