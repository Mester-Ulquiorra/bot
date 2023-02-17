import { Client, ComponentType, TextChannel } from "discord.js";
import { create as svgCreate } from "svg-captcha";
import config from "../config.js";
import Event from "../types/Event.js";
import Ulquiorra, { browser } from "../Ulquiorra.js";
import AutoUnpunish from "../util/AutoUnpunish.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import Log from "../util/Log.js";
import ManageRole from "../util/ManageRole.js";
import ServerStats from "../util/ServerStats.js";

const ReadyEvent: Event = {
    name: "ready",

    async run(client: Client) {
        // fetch the guild and its channels
        client.guilds.fetch(config.GuildId).then((guild) => {
            guild.channels.fetch();
        });

        // fetch the prison 
        client.guilds.fetch(config.PrisonId).catch(() => { return; });

        client.user.setActivity({
            name: `Version ${config.Version}`,
        });

        AutoUnpunish();
        ServerStats();
        setupVerifyListener();

        Log(`Successfully logged in as ${client.user.tag}!`);
        console.timeEnd("Boot");
    }
};

/**
 * A map holding every people who are on verify cooldown (2 minutes);
 */
const verifyCooldown = new Map<string, number>();

async function setupVerifyListener() {
    // get the verify channel
    const verifyChannel = await GetGuild().channels.fetch(config.channels.Verify) as TextChannel;

    // fetch the first message in the verify channel (should be ours);
    const verifyMessage = (await verifyChannel.messages.fetch())
        .filter(m => m.author.id === Ulquiorra.user.id)
        .last();

    // set up the component listener
    verifyMessage
        .createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (x) => x.customId === "verify",
        })
        .on("collect", async (interaction) => {
            await interaction.deferReply({ ephemeral: true });

            // check if they're in the cooldown (create them if needed)
            const cooldown =
                verifyCooldown.get(interaction.user.id) ??
                verifyCooldown
                    .set(interaction.user.id, 0)
                    .get(interaction.user.id);

            // 120 is 2 minutes
            if (cooldown + 120 > Math.floor(Date.now() / 1000)) {
                // they're in cooldown
                interaction.editReply({ content: "You are currently in cooldown, please try again later." });
                return;
            }


            // create the captcha using svg-captcha
            const captcha = svgCreate({
                size: 5,
                noise: 1,
                color: true,
                background: "#212121",
            });

            // convert the captcha buffer into a png with puppeteer
            const page = await browser.newPage();
            await page.setViewport({ width: 600, height: 200 });

            const realData = captcha.data.replace(`width="150"`, `width="600"`).replace(`height="50"`, `height="200"`);
            // set the content with the body being realData and margin set to 0
            await page.setContent(`<body style="margin: 0">${realData}</body>`);
            const captchaBuffer = await page.screenshot({
                type: "png",
                omitBackground: true,
            });
            
            await page.close();


            // try to dm the user
            interaction.user
                .send({
                    embeds: [
                        CreateEmbed(
                            `Here is your captcha, you have 30 seconds to type what you see.`,
                            { color: EmbedColor.Success, }
                        ),
                    ],
                    files: [
                        {
                            attachment: captchaBuffer,
                            name: "captcha.png",
                        },
                    ],
                })
                .then((message) => {
                    interaction.editReply({
                        content: "Your captcha has been sent to you.",
                    });

                    // set the cooldown
                    verifyCooldown.set(
                        interaction.user.id,
                        Math.floor(Date.now() / 1000)
                    );

                    // create a message collector
                    message.channel
                        .awaitMessages({
                            filter: (x) => x.author.id === interaction.user.id,
                            time: 30_000,
                            max: 1,
                        })
                        .then((collected) => {
                            // get the first message
                            const firstMessage = collected.first();

                            // check if the message is the same as the captcha
                            if (firstMessage.content === captcha.text) {
                                // the user is verified

                                // give them the role
                                ManageRole(
                                    interaction.member,
                                    config.roles.Member,
                                    "Add",
                                    "verified user"
                                );

                                // edit the message
                                message.edit({
                                    embeds: [
                                        CreateEmbed(
                                            `You have been successfully verified!`,
                                            { color: EmbedColor.Success }
                                        ),
                                    ],
                                });
                            } else {
                                // the code is wrong
                                message.edit({
                                    embeds: [
                                        CreateEmbed(
                                            `The code you entered was incorrect.`,
                                            { color: EmbedColor.Error }
                                        ),
                                    ],
                                });
                            }
                        })
                        .catch(() => {
                            // the user didn't verify in time
                            message.edit({
                                embeds: [
                                    CreateEmbed(
                                        `You did not verify in time, please try again.`,
                                        { color: EmbedColor.Error }
                                    ),
                                ],
                            });
                        });
                })
                .catch(() => {
                    // the user probably has dms disabled
                    interaction.editReply({ content: "Please enable DMs in order to verify yourself.", });
                });
        });
}

export default ReadyEvent;