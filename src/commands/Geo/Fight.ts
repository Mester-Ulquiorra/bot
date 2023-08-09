import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, GuildMember, Message } from "discord.js";
import { IDBGeo } from "../../database/GeoConfig.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { RandomIntWithLinearlyDecreasingChance, RoundNumber } from "../../util/MathUtils.js";
import GeoData from "./GeoData.js";
import { GetGeoConfig, GetGeoMultiplier } from "./Util.js";
import { Image, createCanvas } from "@napi-rs/canvas";
import { logger } from "../../Ulquiorra.js";
import Cache from "../../util/Cache.js";

interface GeoFightPlayer {
	member: GuildMember;
	mana: number;
	health: number;
	config: IDBGeo;
}

interface GeoFightEnemy {
	name: string;
	hp: number;
	attack: number;
	defense: number;
}

const enemyNames = ["Moss Knight", "Moss Charger", "Moss Flyer", "Mosskin", "Mester"];

const fightingUsers = new Set<string>();
const avatarCache = new Cache<string, Buffer>();

const borderColor = "#fff";

function generateEnemy() {
	// randomly generate hp, attack and defense
	const hp = RandomIntWithLinearlyDecreasingChance(30, 50);
	const attack = RandomIntWithLinearlyDecreasingChance(2, 5);
	const defense = RandomIntWithLinearlyDecreasingChance(5, 15);

	// return enemy
	return {
		name: enemyNames[Math.floor(Math.random() * enemyNames.length)],
		hp,
		attack,
		defense,
	} as GeoFightEnemy;
}

class GeoFight {
	player: GeoFightPlayer;
	enemy: GeoFightEnemy;
	message: Message;

	constructor(player: GeoFightPlayer, message: Message) {
		this.player = player;
		this.enemy = generateEnemy();
		this.message = message;

		this.turn();
	}

	async turn(newTurn = true) {
		if (newTurn) {
			// add speed to mana
			if (newTurn) this.player.mana += Math.min(this.player.config.stats.speed, this.player.config.stats.mana - this.player.mana);

			const components = [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId("geofight.attack").setLabel("Attack").setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId("geofight.skill").setLabel("Skill").setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId("geofight.end")
						.setLabel("Let the enemy eat you (end fight)")
						.setStyle(ButtonStyle.Danger)
				),
			];

			const rendered = await this.render();

			this.message.edit({
				components,
				content: "",
				files: [{ attachment: rendered, name: "fight.png" }],
			});
		}

		this.message
			.awaitMessageComponent({
				filter: (i) =>
					i.user.id === this.player.member.id && ["geofight.attack", "geofight.skill", "geofight.end"].includes(i.customId),
				time: 120 * 1000,
				componentType: ComponentType.Button,
			})
			.then((i) => {
				this.processComponent(i);
			})
			.catch(() => {
				this.end(true);
			});
	}

	async processComponent(interaction: ButtonInteraction) {
		if (interaction.customId === "geofight.end") {
			return this.end(true);
		}

		const enemyDamageReduction = 1 - this.enemy.defense / 100;
		let enemyDamage = 0;

		if (interaction.customId === "geofight.attack") {
			enemyDamage = this.player.config.stats.attack * enemyDamageReduction;
		}

		if (interaction.customId === "geofight.skill") {
			// check if we have enough mana
			if (this.player.mana < 5) {
				await interaction.reply({
					content: "You don't have enough mana!",
					ephemeral: true,
				});

				return this.turn(false);
			}

			this.player.mana -= 5;

			enemyDamage = 5 * enemyDamageReduction;
		}

		this.enemy.hp = Math.max(0, RoundNumber(this.enemy.hp - enemyDamage));

		const embed = CreateEmbed(
			`**${this.player.member.user.username}** dealt ${enemyDamage} damage to **${this.enemy.name}**!`
		).setFooter({
			text: "This is a tech preview of the Geo fight system, the UI is not final",
		});

		embed.addFields(
			{ name: "Health", value: `${this.player.health}/${this.player.config.stats.hp}`, inline: false },
			{
				name: "Enemy",
				value: `${this.enemy.name} (${RoundNumber(this.enemy.hp + enemyDamage)} -> ${this.enemy.hp} hp)`,
				inline: true,
			},
			{ name: "Enemy attack", value: `${this.enemy.attack}`, inline: true },
			{ name: "Enemy defense", value: `${this.enemy.defense}`, inline: true }
		);

		const components = [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId("geofight.next").setLabel("Next").setStyle(ButtonStyle.Success)
			),
		];

		await interaction.update({
			embeds: [embed],
			components,
		});

		this.message
			.awaitMessageComponent({
				filter: (i) => i.user.id === this.player.member.id && i.customId === "geofight.next",
				time: 60000,
				componentType: ComponentType.Button,
			})
			.then((i) => {
				i.deferUpdate();
			})
			.catch(() => {
				return;
			})
			.finally(() => {
				if (this.enemy.hp <= 0) return this.end(true);

				// enemy attacks
				const playerDamageReduction = 1 - this.player.config.stats.defense / 100;
				const playerDamage = this.enemy.attack * playerDamageReduction;
				this.player.health = Math.max(0, RoundNumber(this.player.health - playerDamage));

				const embed = CreateEmbed(
					`**${this.enemy.name}** dealt ${playerDamage} damage to **${this.player.member.user.username}**!`
				).setFooter({
					text: "This is a tech preview of the Geo fight system, the UI is not final",
				});

				embed.addFields(
					{
						name: "Health",
						value: `${RoundNumber(this.player.health + playerDamage)} -> ${this.player.health}`,
						inline: false,
					},
					{ name: "Enemy", value: `${this.enemy.name} (${this.enemy.hp} hp)`, inline: true },
					{ name: "Enemy attack", value: `${this.enemy.attack}`, inline: true },
					{ name: "Enemy defense", value: `${this.enemy.defense}`, inline: true }
				);

				const components = [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setCustomId("geofight.next").setLabel("Next").setStyle(ButtonStyle.Success)
					),
				];

				this.message.edit({
					embeds: [embed],
					components,
				});

				this.message
					.awaitMessageComponent({
						filter: (i) => i.user.id === this.player.member.id && i.customId === "geofight.next",
						time: 60000,
						componentType: ComponentType.Button,
					})
					.then((i) => {
						i.deferUpdate();
					})
					.catch(() => {
						return;
					})
					.finally(() => {
						if (this.player.health <= 0) {
							return this.end(false);
						}

						this.turn();
					});
			});
	}

	async end(win: boolean) {
		const multiplier = await GetGeoMultiplier(this.player.member, this.player.config);

		let description = `**${this.player.member.user.username}** ${win ? "won" : "lost"} the fight!\n`;
		if (!win) {
			// lose 35% + multiplier of geo
			const geoLost = Math.floor(this.player.config.balance.geo * (0.35 + (multiplier.geo === 1 ? 0 : multiplier.geo) / 100));
			this.player.config.balance.geo -= geoLost;
			description += `Because you died, you lost ${geoLost} ${GeoData.GeoIcon}.`;
		} else {
			// win remaining health * 7 geo
			const geoWon = Math.floor(this.player.health * 7) * multiplier.geo;
			this.player.config.balance.geo += geoWon;
			description += `You gained ${geoWon} ${GeoData.GeoIcon}!`;
		}

		await this.player.config.save();

		fightingUsers.delete(this.player.member.id);

		const embed = CreateEmbed(description, {
			color: win ? "success" : "error",
		});

		this.message.edit({
			embeds: [embed],
			components: [],
		});
	}

	static isFighting(userId: string) {
		return fightingUsers.has(userId);
	}

	static async build(message: Message, playerMember: GuildMember) {
		const playerConfig = await GetGeoConfig(playerMember.id);

		fightingUsers.add(playerMember.id);

		const fight = new GeoFight(
			{
				member: playerMember,
				mana: playerConfig.stats.mana,
				health: playerConfig.stats.hp,
				config: playerConfig,
			},
			message
		);

		return fight;
	}

	async render() {
		// create a 400x250 canvas
		const canvas = createCanvas(400, 250);

		// get the 2d context
		const ctx = canvas.getContext("2d");

		// draw a 2px border
		ctx.fillStyle = borderColor;
		ctx.fillRect(0, 0, 400, 250);
		ctx.fillStyle = "#000000";
		ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);

		// draw a separator line at 60% height
		const userY = 150;
		ctx.fillStyle = borderColor;
		ctx.fillRect(0, userY, 400, 2);

		// for the y calculation we want the image to be centered between canvas height and userY
		// so we do (canvas height - userY) / 2 + userY - 32
		const avatarX = 10;
		const avatarY = (canvas.height - userY) / 2 + userY - 32;

		// draw player health bar first, so it's behind the avatar
		// there are two bars: health and and mana bar, we want them to touch each other in the middle of the avatar
		// the bars are 10 pixel wide, so draw it at avatarY + 32 - 10
		// for the x coordinate, we want it to be in the middle of the avatar + 15 px (it'll clip a bit and won't show low health)
		// but that should be fine
		const barX = avatarX + 32 + 15;
		const barWidth = 200;
		const barHeight = 10;

		// utility coordinates for health and mana bar
		const healthBarY = avatarY + 32 - 10;
		const manaBarY = avatarY + 32;

		// draw border
		const drawBorder = () => {
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(barWidth, 0);
			ctx.arc(barWidth, barHeight / 2, barHeight / 2, -Math.PI / 2, Math.PI / 2);
			ctx.lineTo(0, barHeight);
			ctx.arc(0, barHeight / 2, barHeight / 2, Math.PI / 2, -Math.PI / 2);
			ctx.closePath();
			ctx.fill();
		};

		// draw bar with 2 px offset
		const drawBar = (length: number) => {
			console.log(length);
			const barEnd = 2 + (barWidth - 4) * length;
			ctx.beginPath();
			ctx.moveTo(2, 2);
			ctx.lineTo(barEnd, 2);
			ctx.arc(barEnd, barHeight / 2, barHeight / 2 - 2, -Math.PI / 2, Math.PI / 2);
			ctx.lineTo(2, barHeight - 2);
			ctx.arc(2, barHeight / 2, barHeight / 2 - 2, Math.PI / 2, -Math.PI / 2);
			ctx.closePath();
			ctx.fill();
		};

		// draw health
		const healthPercentage = this.player.health / this.player.config.stats.hp;
		ctx.translate(barX, healthBarY);
		ctx.fillStyle = borderColor;
		drawBorder();
		ctx.fillStyle = "#ff0000";
		drawBar(healthPercentage);
		ctx.resetTransform();

		// draw mana
		const manaPercentage = this.player.mana / this.player.config.stats.mana;
		ctx.translate(barX, manaBarY);
		ctx.fillStyle = borderColor;
		drawBorder();
		ctx.fillStyle = "#0000ff";
		drawBar(manaPercentage);
		ctx.resetTransform();

		// draw the player's avatar
		const image = new Image();

		let avatar = avatarCache.get(this.player.member.id);
		if (!avatar) {
			const url = this.player.member.user.displayAvatarURL({ extension: "png", size: 64 });
			avatar = await downloadURL(url);
			avatarCache.set(this.player.member.id, avatar);
		}
		image.src = avatar;

		// translate the ctx to make the drawing easier
		// draw a circular image with a 1px border
		ctx.translate(avatarX, avatarY);
		ctx.fillStyle = borderColor;
		ctx.beginPath();
		ctx.arc(32, 32, 32, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(32, 32, 31, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(image, 0, 0, 64, 64);
		ctx.resetTransform();

		// export the canvas as a buffer
		return canvas.toBuffer("image/png");
	}
}

function downloadURL(url: string) {
	return new Promise<Buffer>((resolve, reject) => {
		fetch(url)
			.then(async (res) => {
				if (!res.ok) {
					logger.log(`Error downloading ${url} (${res.status} ${res.statusText})`, "error");
					throw new Error("Network error");
				}
				return res.arrayBuffer();
			})
			.then((buf) => resolve(Buffer.from(buf)))
			.catch((err) => reject(err));
	});
}

export default GeoFight;
