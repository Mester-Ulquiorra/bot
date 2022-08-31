import { Client, ComponentType, TextChannel } from "discord.js";
import config from "../config";
import Event from "../types/Event";
import { GetGuild } from "../util/ClientUtils";
import Log from "../util/Log";
import { create as svgCreate } from "svg-captcha";
import * as sharp from "sharp";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";
import ManageRole from "../util/ManageRole";
import AutoUnpunish from "../util/AutoUnpunish";
import ServerStats from "../util/ServerStats";

const ReadyEvent: Event = {
	name: "ready",

	async run(client: Client) {
		// fetch the guild and their channels
		client.guilds.fetch(config.GUILD_ID).then((guild) => {
			guild.channels.fetch();
		});
		// fetch the prison
		client.guilds.fetch(config.PRISON_ID);

		client.user.setActivity({
			name: `Version ${config.VERSION}`,
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
	const verifyChannel = await GetGuild().channels.fetch("1006077960584970280") as TextChannel;

	// fetch the first message in the verify channel (should be ours);
	const verifyMessage = (await verifyChannel.messages.fetch()).last();

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
				size: 6,
				noise: 1,
				color: true,
				background: "#212121",
			});

			const captchaBuffer = await sharp(Buffer.from(captcha.data))
				.resize(500)
				.png()
				.toBuffer();

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
									config.MEMBER_ROLE,
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
									files: [],
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
									files: [],
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
								files: [],
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