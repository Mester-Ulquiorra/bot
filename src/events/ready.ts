import { Client, ComponentType, TextChannel } from "discord.js";
import Ulquiorra, { logger } from "../Ulquiorra.js";
import config from "../config.js";
import testMode from "../testMode.js";
import Event from "../types/Event.js";
import AutoUnpunish from "../util/AutoUnpunish.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import ManageRole from "../util/ManageRole.js";
import ServerStats from "../util/ServerStats.js";
const ReadyEvent: Event = {
    name: "ready",

    async run(client: Client) {
        // fetch the guild and its channels (make sure than fetchMe is blocking, because it's important)
        await client.guilds.fetch(config.GuildId).then(async (guild) => {
            await guild.members.fetchMe();
            guild.channels.fetch();
        });

        // fetch the prison 
        client.guilds.fetch(config.PrisonId).catch(() => { return; });

        client.user.setActivity({
            name: `Version ${config.Version}`,
        });

        AutoUnpunish();
        ServerStats();
        SetupVerifyListener();

        logger.log(`Successfully logged in as ${client.user.tag}!`);
        console.timeEnd("Boot");
    }
};

/**
 * A map holding every people who are on verify cooldown (2 minutes);
 */
const verifyCooldown = new Map<string, number>();

async function SetupVerifyListener() {
    // get the verify channel
    const verifyChannel = await GetGuild().channels.fetch(config.channels.Verify) as TextChannel;

    // fetch the first message in the verify channel from the bot
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
            await interaction.deferUpdate();

            // check if they're in the cooldown (create them if needed)
            const cooldown =
                verifyCooldown.get(interaction.user.id) ??
                verifyCooldown
                    .set(interaction.user.id, 0)
                    .get(interaction.user.id);

            // check for cooldown
            if (cooldown > Date.now() && !testMode) {
                // they're in cooldown
                interaction.followUp({ content: "You are currently in cooldown, please try again later.", ephemeral: true });
                return;
            }

            // cooldown is 30 seconds
            verifyCooldown.set(interaction.user.id, Date.now() + 30 * 1000);

            // create the captcha using svg-captcha
            const captcha = GenerateCaptchaPrompt();

            // send the captcha to the channel and mention the user
            const botMessage = await interaction.channel.send({
                content: `${interaction.user}, you have 30 seconds to solve this math question (you have to type the answer as a number): \n ${captcha.prompt}`
            });

            // set up a listener for the user
            const messages = await botMessage.channel
                .awaitMessages({
                    filter: m => m.author.id === interaction.user.id,
                    time: 30_000,
                    max: 1
                })
                .catch(() => {
                    // the user didn't answer
                    botMessage.edit({
                        embeds: [
                            CreateEmbed(
                                `You didn't answer in time.`,
                                { color: "error" }
                            ),
                        ],
                    });
                });

            if (!messages || messages.size === 0) return;

            const userMessage = messages.first();

            setTimeout(() => {
                // delete the messages
                botMessage.delete();
                userMessage.delete();
            }, 10 * 1000);

            // check if the message is the same as the captcha
            if (userMessage.content === captcha.answer.toString()) {
                // the user is verified

                // add member and remove unverified
                ManageRole(
                    interaction.member,
                    config.roles.Member,
                    "Add",
                    "verified user"
                );

                ManageRole(
                    interaction.member,
                    config.roles.Unverified,
                    "Remove",
                    "verified user"
                );

                // edit the message
                botMessage.edit({
                    embeds: [
                        CreateEmbed(
                            `You have been successfully verified!`,
                            { color: "success" }
                        ),
                    ],
                });
            } else {
                // the code is wrong
                botMessage.edit({
                    embeds: [
                        CreateEmbed(
                            `The answer you entered was incorrect.\nThe correct answer was: ${captcha.answer}`,
                            { color: "error" }
                        ),
                    ],
                });
            }
        });
}

function GenerateCaptchaPrompt() {
    // generate an array of random integers between 0 and 9 (length is between 2 and 3)
    const numbers = Array.from({ length: Math.floor(Math.random() * 2) + 2 }, () => Math.floor(Math.random() * 10));
    // generate an array of random operators (only +, - and *), length is numbers.length - 1
    const operators = Array.from({ length: numbers.length - 1 }, () => ["+", "-", "*"][Math.floor(Math.random() * 3)]);
    // join the numbers and operators together
    const prompt = numbers.map((n, i) => `${n} ${operators[i] ?? ""}`).join(" ").trim();
    // replace some of the numbers randomly with their English name
    const promptWithNames = prompt
        .replace(/(\d+)/g, (match) => {
            if (Math.random() < 0.35) return match;
            return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][parseInt(match)]
                .split("")
                .map((c) => {
                    // chance to capitalize
                    if (Math.random() < 0.45) c = c.toUpperCase();
                    // chance to add underscore
                    if (Math.random() < 0.15) c = `_${c}`;
                    return c;
                })
                .join("");
        })
        // replace some of the operators randomly with their English name
        .replace(/(\+|-|\*)/g, (match) => {
            if (Math.random() < 0.55) return match;
            return ["plus", "minus", "times"][["+", "-", "*"].indexOf(match)];
        });
    // calculate the answer
    const answer = eval(prompt) as number;

    return { prompt: promptWithNames, answer };
}

export default ReadyEvent;