import { createCanvas, Image, registerFont } from "canvas";
import { EmbedBuilder, GuildMember } from "discord.js";
import * as path from "path";
import * as sharp from "sharp";
import SlashCommand from "../types/SlashCommand";
import CreateEmbed from "../util/CreateEmbed";
import { GetLevelConfig, LevelToXP, XPToLevelUp } from "../util/LevelUtil";

const CardWidth = 1500;
const CardHeight = 300;

const CardBackground = path.join(path.dirname(require.main.filename), "res", "rank", "background.png");
let Background: Buffer = null;
registerFont(path.join(path.dirname(require.main.filename), "res", "rank", "Merriweather.ttf"), { family: "Merriweather" });

const RankCommand: SlashCommand = {
    name: "rank",

    async run(interaction, _client) {
        // get the member (might be null, if it is, we need to get the rank information of the user)
        const member = interaction.options.getUser("member") ?? interaction.member as GuildMember;

        // get level config
        const levelConfig = await GetLevelConfig(member.id);

        if (interaction.options.getBoolean("textmode")) {
            // create the embed
            const embed = CreateEmbed(`Level rank of <@${levelConfig.id}>`, {
                author: member,
            });

            // add the fields
            AddRankFieldEmbeds(embed, levelConfig);

            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        // now let's create the image
        let canvas = createCanvas(CardWidth, CardHeight);
        const context = canvas.getContext("2d");

        // draw the background
        const backgroundBuffer = await getBackground();
        const background = await loadImage(backgroundBuffer)
        context.drawImage(background, 0, 0, CardWidth, CardHeight);
        delete background.onload; delete background.src;

        // draw the avatar and username
        const avatar = await loadImage(member.displayAvatarURL({ size: 256, extension: "png" }));
        context.drawImage(avatar, (CardHeight - 256) / 2, (CardHeight - 256) / 2, 256, 256);
        delete avatar.onload; delete avatar.src;

        const meterStartX = 256 + (CardHeight - 256) / 2 + 50;
        const meterStartY = CardHeight - (CardHeight - 256) / 2 - 80;

        context.fillStyle = "#000000";
        context.font = "50px 'Merriweather' bold";
        context.textAlign = "start";
        context.fillText(member instanceof GuildMember ? member.user.tag : member.tag, meterStartX, meterStartY - 5);

        const relativexp = levelConfig.xp - LevelToXP(levelConfig.level);
        const levelupPercent = relativexp / XPToLevelUp(levelConfig.level);
        let meterEndX = meterStartX + (CardWidth - 50 - meterStartX) * levelupPercent;

        // draw levelup meter

        // fill
        context.beginPath();
        context.fillStyle = "#03ecfc";
        context.moveTo(meterStartX, meterStartY);
        context.lineTo(meterEndX, meterStartY);
        context.lineTo(meterEndX, meterStartY + 30);
        context.lineTo(meterStartX, meterStartY + 30);
        context.bezierCurveTo(meterStartX - 10, meterStartY + 20, meterStartX - 10, meterStartY + 10, meterStartX, meterStartY);
        context.fill();

        // current xp
        context.font = "25px 'Merriweather' bold";
        context.textAlign = "center";
        context.fillStyle = "#000000";
        let text = `Current XP: ${levelConfig.xp} (${(levelupPercent * 100).toFixed(2)}%)`;
        context.fillText(text, meterStartX + (meterEndX - meterStartX) / 2, meterStartY + 25);

        // outline
        meterEndX = CardWidth - 50;
        context.beginPath();
        context.strokeStyle = "#000000";
        context.lineWidth = 2;
        context.moveTo(meterStartX, meterStartY);
        context.lineTo(meterEndX, meterStartY);
        context.bezierCurveTo(meterEndX + 10, meterStartY + 10, meterEndX + 10, meterStartY + 20, meterEndX, meterStartY + 30);
        context.lineTo(meterStartX, meterStartY + 30);
        context.bezierCurveTo(meterStartX - 10, meterStartY + 20, meterStartX - 10, meterStartY + 10, meterStartX, meterStartY);
        context.stroke();

        // level texts
        context.textAlign = "start";
        context.font = "30px 'Merriweather' bold";
        text = `Level ${levelConfig.level}`;
        context.fillText(text, meterStartX, meterStartY + 60);
        context.fillText(`(${LevelToXP(levelConfig.level)} XP)`, meterStartX, meterStartY + 95);
        context.textAlign = "end";
        text = `Level ${levelConfig.level + 1}`;
        context.fillText(text, meterEndX, meterStartY + 60);
        context.fillText(`(${LevelToXP(levelConfig.level + 1)} XP)`, meterEndX, meterStartY + 95);

        // total xp
        context.font = "50px 'Merriweather' bold";
        context.fillText(`Total XP: ${levelConfig.xp}`, meterEndX, meterStartY - 5);

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

    Background = await sharp(CardBackground)
        .blur(9)
        .toBuffer();

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
export function AddRankFieldEmbeds(embed: EmbedBuilder, levelConfig: any) {
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