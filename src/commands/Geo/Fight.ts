import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, GuildMember, Message } from "discord.js";
import { IDBGeo } from "../../database/GeoConfig.ts";
import CreateEmbed from "../../util/CreateEmbed.ts";
import { RandomIntWithLinearlyDecreasingChance, RoundNumber } from "../../util/MathUtils.ts";
import GeoData from "./GeoData.ts";
import { GetGeoConfig, GetGeoMultiplier } from "./Util.ts";

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

		this.render();
	}

	render(newTurn = true) {
		if (newTurn) {
			const embed = CreateEmbed(`**${this.player.member.user.username}** is fighting!`).setFooter({
				text: "This is a tech preview of the Geo fight system, the UI is not final",
			});

			// add speed to mana
			if (newTurn) this.player.mana += Math.min(this.player.config.stats.speed, this.player.config.stats.mana - this.player.mana);

			embed.addFields(
				{ name: "Health", value: `${this.player.health}/${this.player.config.stats.hp}`, inline: true },
				{ name: "Mana", value: `${this.player.mana}/${this.player.config.stats.mana}`, inline: true },
				{ name: "Mana regen", value: `${this.player.config.stats.speed}`, inline: true },
				{ name: "Weapon", value: `None (${this.player.config.stats.attack} attack)`, inline: true },
				{ name: "Armor", value: `None (${this.player.config.stats.defense} defense)`, inline: true },
				{ name: "Skill", value: `Vengeful Spirit (5 attack, 5 mana)`, inline: true },
				{ name: "Enemy", value: `${this.enemy.name} (${this.enemy.hp} hp)`, inline: true },
				{ name: "Enemy attack", value: `${this.enemy.attack}`, inline: true },
				{ name: "Enemy defense", value: `${this.enemy.defense}`, inline: true }
			);

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

			this.message.edit({
				content: "",
				embeds: [embed],
				components,
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
				this.end(false);
			});
	}

	async processComponent(interaction: ButtonInteraction) {
		if (interaction.customId === "geofight.end") {
			return this.end(false);
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

				return this.render(false);
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

						this.render();
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
}

export default GeoFight;
