import { GuildMember, Message, spoiler } from "discord.js";
import config from "../config.js";
import LevelConfig, { IDBLevel } from "../database/LevelConfig.js";
import testMode from "../testMode.js";
import { GetGuild, GetSpecialChannel } from "./ClientUtils.js";
import CreateEmbed from "./CreateEmbed.js";
import gib_detect from "./GibberishDetector/gib_detect.js";
import Log from "./Log.js";
import ManageRole from "./ManageRole.js";

// https://www.desmos.com/calculator/f3bsamea49?lang=de

/**
 * A map that holds when a user last sent a message.
 * Used to limit the xp gain rate.
 */
const LastMessages = new Map<string, number>();

/**
 * A function for getting the xp from a message.
 * @param message The message to extract the xp from.
 * @returns The amount of xp gained from the message.
 */
async function GetXPFromMessage(message: Message) {
    // get the content without whitespace
    const content = message.content.replaceAll(/\s/gu, "");

    // get the config from the map
    if (!LastMessages.has(message.author.id))
        // make sure to add the member if they aren't in the map
        LastMessages.set(message.author.id, 0);

    // get the last time the member has sent a message
    const lastMessage = LastMessages.get(message.author.id);

    // get the level config of the user
    const levelConfig = await GetLevelConfig(message.author.id);

    const currTime = Date.now();

    // check if the user has sent a message in this 10 second interval
    if (
        (currTime - lastMessage < 10 * 1000) &&
        !testMode
    )
        return 0;

    // set this message to the member's last message
    LastMessages.set(message.author.id, currTime);

    // check if the message is gibberish
    if (!gib_detect(content)) return 0;

    // calculate the xp gained from the message
    const xp = LengthToXP(content.length, XPToLevel(levelConfig.xp));
    if (xp === 0) return null;

    // now add it to the user
    AddXPToUser(levelConfig, xp, message);

    return xp;
}

/**
 * A function for getting the max amount of xp a user can get at a certain level.
 * @param level The level to get the max xp of.
 */
function XPCapOfLevel(level: number) {
    return Math.floor(-0.045 * (level - 100) ** 2 + 500);
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
    return Math.floor(Math.min(XPCapOfLevel(level), 0.00025 * length ** 2 + 10));
}

/**
 * A function for adding xp to the user (and automatically leveling them up if they've reached the new level).
 * @param levelConfig The level config of the user.
 * @param xp The xp to add.
 * @param message The message that was sent.
 */
async function AddXPToUser(levelConfig: IDBLevel, xp: number, message: Message) {
    levelConfig.xp += xp;
    if (XPToLevel(levelConfig.xp) > XPToLevel(levelConfig.xp - xp)) {
        // we leveled up!
        const newLevel = XPToLevel(levelConfig.xp);
        const newRole = ManageLevelRole(message.member, newLevel);

        GetGuild()
            .members
            .fetch(message.author.id)
            .then((member) => {
                // we got the member!
                AlertMember(
                    member,
                    newLevel,
                    message,
                    newRole
                );
            })
            .catch(() =>
                Log(`Couldn't find user, perhaps they left?`, "warn")
            );
    }

    await levelConfig.save();
}

/**
 * A function that resets and updates a user's level role.
 * @param member The member to update.
 * @param memberLevel The level of the user.
 * @return The role id that was added.
 */
function ManageLevelRole(member: GuildMember, memberLevel: number) {
    // get the role that the user should have
    const levelRole = config.LevelRoles.find(role => role.level == memberLevel);
    if (!levelRole) return;

    // get the current level role id that the user has
    const currRole = config.LevelRoles.filter(role => member.roles.cache.has(role.id)).at(-1);

    ManageRole(member, currRole.id, "Remove", "level up");
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

    // if new_role is not null, get the role name
    if (newRole) {
        const roleName = await GetGuild().roles.fetch(newRole)
            .then((role) => {
                return role.name;
            });

        embedDescription += `\nAs a reward of your hard work, you've been given the **${roleName}** role!`;
    }

    // create embed
    const alertembed = CreateEmbed(embedDescription, {
        color: "success",
    }).addFields([
        {
            name: `Achieved at`,
            value: `<t:${Math.floor(message.createdTimestamp / 1000)}>`,
            inline: true,
        },
    ]);

    GetSpecialChannel("LevelUp")
        .send({
            content: spoiler(`<@${member.id}>`),
            embeds: [alertembed],
        });
}

export {
    GetXPFromMessage,
    LevelToXP,
    XPToLevelUp,
    XPToLevel,
    GetLevelConfig,
};

