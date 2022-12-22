import { createCanvas, Image, registerFont } from "canvas";
import { EmbedBuilder, GuildMember } from "discord.js";
import { readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath, URL } from "url";
import { DBLevel } from "../types/Database.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { GetLevelConfig, LevelToXP, XPToLevelUp } from "../util/LevelUtil.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const CardWidth = 1500;
const CardHeight = 300;

const BackgroundFile = path.join(__dirname, "..", "res", "rank", "background-blur.png");
let Background: Buffer | string = null;
registerFont(path.join(__dirname, "..", "res", "rank", "Merriweather.ttf"), { family: "Merriweather" });

const RankCommand: SlashCommand = {
    name: "rank",

    async run(interaction, _client) {
        // get the member (might be null, if it is, we need to get the rank information of the user)
        const member = interaction.options.getUser("member") ?? interaction.member as GuildMember;

        // get level config
        const levelConfig = await GetLevelConfig(member.id);

        if (interaction.options.getBoolean("textmode")) {
            // create the embed
            const embed = CreateEmbed(`Level rank of <@${levelConfig.userId}>`, {
                author: member,
            });

            // add the fields
            AddRankFieldEmbeds(embed, levelConfig);

            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: false });

        // now let's create the image
        let canvas = createCanvas(CardWidth, CardHeight);
        const ctx = canvas.getContext("2d");

        // draw the background
        const backgroundBuffer = await getBackground();
        const background = await loadImage(backgroundBuffer)
        ctx.drawImage(background, 0, 0, CardWidth, CardHeight);

        // draw the avatar and username
        const avatar = await loadImage(member.displayAvatarURL({ size: 256, extension: "png" }));
        ctx.drawImage(avatar, (CardHeight - 256) / 2, (CardHeight - 256) / 2, 256, 256);

        const meterStartX = 256 + (CardHeight - 256) / 2 + 50;
        const meterStartY = CardHeight - (CardHeight - 256) / 2 - 80;

        ctx.fillStyle = "#000000";
        ctx.font = "50px 'Merriweather' bold";
        ctx.textAlign = "start";
        ctx.fillText(member instanceof GuildMember ? member.user.tag : member.tag, meterStartX, meterStartY - 5);

        const relativexp = levelConfig.xp - LevelToXP(levelConfig.level);
        const levelupPercent = relativexp / XPToLevelUp(levelConfig.level);
        let meterEndX = meterStartX + (CardWidth - 50 - meterStartX) * levelupPercent;

        // draw levelup meter

        // fill
        ctx.beginPath();
        ctx.fillStyle = "#03ecfc";
        ctx.moveTo(meterStartX, meterStartY);
        ctx.lineTo(meterEndX, meterStartY);
        ctx.lineTo(meterEndX, meterStartY + 30);
        ctx.lineTo(meterStartX, meterStartY + 30);
        ctx.arc(meterStartX, meterStartY + 15, 15, 0.5 * Math.PI, 1.5 * Math.PI);
        ctx.fill();

        // current xp
        ctx.font = "25px 'Merriweather' bold";
        ctx.textAlign = "start";
        ctx.fillStyle = "#000000";
        let text = `Current XP: ${relativexp} (${(levelupPercent * 100).toFixed(2)}%)`;
        ctx.fillText(text, meterStartX, meterStartY + 25);

        // outline
        meterEndX = CardWidth - 50;
        ctx.beginPath();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.moveTo(meterStartX, meterStartY);
        ctx.lineTo(meterEndX, meterStartY);
        ctx.arc(meterEndX, meterStartY + 15, 15, 1.5 * Math.PI, 0.5 * Math.PI);
        ctx.lineTo(meterStartX, meterStartY + 30);
        ctx.arc(meterStartX, meterStartY + 15, 15, 0.5 * Math.PI, 1.5 * Math.PI);
        ctx.stroke();

        // level texts
        ctx.font = "30px 'Merriweather' bold";
        text = `Level ${levelConfig.level}`;
        ctx.fillText(text, meterStartX, meterStartY + 60);
        ctx.textAlign = "end";
        text = `Level ${levelConfig.level + 1} (${XPToLevelUp(levelConfig.level)} XP)`;
        ctx.fillText(text, meterEndX, meterStartY + 60);

        // total xp
        ctx.font = "50px 'Merriweather' bold";
        ctx.fillText(`Total XP: ${levelConfig.xp}`, meterEndX, meterStartY - 5);

        const buffer = canvas.toBuffer("image/png");

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

async function getBackground() {
    if (Background != null) return Background;

    const data = readFileSync(BackgroundFile);

    Background = data;

    return Background;
}

function loadImage(source: string | Buffer) {
    return new Promise<Image>((resolve, reject) => {
        const img = new Image()

        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Failed to load image'))

        img.src = source;
    })
}

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