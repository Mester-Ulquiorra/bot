import { EmbedBuilder } from "discord.js";
import { tmpdir } from "os";
import * as path from "path";
import * as puppeteer from "puppeteer";
import { fileURLToPath, URL } from "url";
import { DBLevel } from "../types/Database.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetLevelConfig, LevelToXP, XPToLevelUp } from "../util/LevelUtil.js";

const minimalArgs = [
    '--autoplay-policy=user-gesture-required',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-domain-reliability',
    '--disable-extensions',
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-hang-monitor',
    '--disable-ipc-flooding-protection',
    '--disable-notifications',
    '--disable-offer-store-unmasked-wallet-cards',
    '--disable-popup-blocking',
    '--disable-print-preview',
    '--disable-prompt-on-repost',
    '--disable-renderer-backgrounding',
    '--disable-setuid-sandbox',
    '--disable-speech-api',
    '--disable-sync',
    '--hide-scrollbars',
    '--ignore-gpu-blacklist',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-sandbox',
    '--no-zygote',
    '--password-store=basic',
    '--use-gl=swiftshader',
    '--use-mock-keychain',
];

const browser = await puppeteer.launch({
    userDataDir: path.join(tmpdir(), "puppeteer"),
    args: [
        "--window-size=1500,300",
        ...minimalArgs
    ]
});

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const htmlFilePath = path.join(__dirname, "..", "res", "rank", "rankTemplate.html");

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

        const relativexp = levelConfig.xp - LevelToXP(levelConfig.level);
        const levelupPercent = relativexp / XPToLevelUp(levelConfig.level);

        const page = await browser.newPage();

        // apparently we need to use Object.assign to not copy by reference.
        const destination = new URL(htmlFilePath, "file:");

        destination.searchParams.append("avatar", user.displayAvatarURL({ size: 256, extension: "png" }));
        destination.searchParams.append("progress", `Current XP: ${relativexp} (${(levelupPercent * 100).toFixed(2)}%)`)
        destination.searchParams.append("progressPercent", (levelupPercent * 100).toString());
        destination.searchParams.append("username", user.tag);
        destination.searchParams.append("totalXp", `Total XP: ${levelConfig.xp}`);
        destination.searchParams.append("currLevel", `Level ${levelConfig.level}`);
        destination.searchParams.append("nextLevel", `Level ${levelConfig.level + 1} (${XPToLevelUp(levelConfig.level) - relativexp} XP left)`);

        await page.setViewport({ width: 1500, height: 300 });
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