import { IDBLevel } from "@mester-ulquiorra/commonlib";
import { GuildMember, Message, spoiler } from "discord.js";
import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import LevelConfig from "../database/LevelConfig.js";
import { GetGuild, GetSpecialChannel } from "./ClientUtils.js";
import CreateEmbed from "./CreateEmbed.js";
import gib_detect from "./GibberishDetector/gib_detect.js";
import ManageRole from "./ManageRole.js";

// https://www.desmos.com/calculator/wkbcatlf9h

/**
 * A function for getting the xp from a message.
 * @param message The message to extract the xp from.
 * @returns The amount of xp gained from the message.
 */
async function GetXPFromMessage(message: Message) {
	// get the content without whitespace
	const content = message.content.replaceAll(/\s/gu, "");

	// get the level config of the user
	const levelConfig = await GetLevelConfig(message.author.id);

	// check if the message is gibberish
	if (!gib_detect(content)) return 0;

	// calculate the xp gained from the message
	const xp = LengthToXP(content.length, XPToLevel(levelConfig.xp));
	if (xp === 0) return 0;

	// now add it to the user
	AddXPToUser(levelConfig, xp, message);

	return xp;
}

/**
 * A function for getting the max amount of xp a user can get at a certain level.
 * @param level The level to get the max xp of.
 */
function XPCapOfLevel(level: number) {
	return Math.floor(4.5 * level + 150);
}

/**
 * A function for calculating the xp of a level.
 * @param level The level to check
 * @returns the xp required for a level
 */
function LevelToXP(level: number) {
	return 1000 * (level - 100) * (level + 100) + 10_000_000;
}

/**
 * A function for calculating the required XP to level up.
 * @param {number} level The current level
 * @returns The total xp required to get the next level
 */
function XPToLevelUp(level: number) {
	return LevelToXP(level + 1) - LevelToXP(level);
}

/**
 * A function for converting xp to a level.
 * @param xp The xp to convert.
 * @returns The level.
 */
function XPToLevel(xp: number) {
	return Math.floor(Math.sqrt(xp / 1000));
}

/**
 * A function for getting the xp gained from a message.
 * @param length The length of the message.
 * @param level The level of the user.
 * @returns The xp gained from the message.
 */
function LengthToXP(length: number, level: number) {
	return Math.floor(Math.min(XPCapOfLevel(level), 0.8 * length + 10));
}

/**
 * A function for adding xp to the user (and automatically leveling them up if they've reached the new level).
 * @param levelConfig The level config of the user.
 * @param xp The xp to add.
 * @param message The message that was sent.
 */
async function AddXPToUser(levelConfig: IDBLevel, xp: number, message: Message) {
	levelConfig.xp += xp;
	await levelConfig.save();
	if (XPToLevel(levelConfig.xp) > XPToLevel(levelConfig.xp - xp)) {
		// we leveled up!
		const newLevel = XPToLevel(levelConfig.xp);
		const newRole = ManageLevelRole(message.member, newLevel);

		GetGuild()
			.members.fetch(message.author.id)
			.then((member) => {
				// we got the member!
				AlertMember(member, newLevel, message, newRole);
			})
			.catch(() => logger.log(`User ${message.author.id} has leveled up, but wasn't in the server???`, "warn"));
	}

}

/**
 * A function that resets and updates a user's level role.
 * @param member The member to update.
 * @param memberLevel The level of the user.
 * @return The role id that was added.
 */
function ManageLevelRole(member: GuildMember, memberLevel: number) {
	// get the role that the user should have
	const levelRole = config.LevelRoles.find((role) => role.level == memberLevel);
	if (!levelRole) return;

	// get the current level role id that the user has
	const currRole = config.LevelRoles.filter((role) => member.roles.cache.has(role.id)).at(-1);

	if (currRole) ManageRole(member, currRole.id, "Remove", "level up");
	ManageRole(member, levelRole.id, "Add", "level up");

	return levelRole.id;
}

/**
 * Get the level config of a user
 * @param userId The user id.
 * @returns The level config object of the user.
 */
async function GetLevelConfig(userId: string) {
	let levelConfig = await LevelConfig.findOne({ userId });
	if (!levelConfig)
		levelConfig = await LevelConfig.create({
			userId,
		});
	return levelConfig;
}

/**
 * A function for alerting a member that they've leveled up.
 * @param member The member to alert.
 * @param newlevel The member's new level.
 * @param message The message that made the member level up.
 * @param newRole The role id that was added to the user.
 */
async function AlertMember(member: GuildMember, newlevel: number, message: Message, newRole: string = null) {
	let embedDescription = `**Congratulations <@${member.id}>, you've successfully achieved level ${newlevel}**! ([Jump to level message](${message.url}))`;

	// if newRole is not null, get the role name
	if (newRole) {
		const roleName = await GetGuild()
			.roles.fetch(newRole)
			.then((role) => {
				return role.name;
			});

		embedDescription += `\nAs a reward of your hard work, you've been given the **${roleName}** role!`;
	}

	// create embed
	const alertembed = CreateEmbed(embedDescription, {
		color: "success",
	});

	GetSpecialChannel("LevelUp").send({
		content: spoiler(`<@${member.id}>`),
		embeds: [alertembed],
	});
}

export { GetLevelConfig, GetXPFromMessage, LevelToXP, XPToLevel, XPToLevelUp };
