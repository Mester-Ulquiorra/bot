import { IDBLevel, LengthToXP, XPToLevel, Cache } from "@mester-ulquiorra/commonlib";
import { GuildMember, Message, spoiler } from "discord.js";
import config from "../config.js";
import LevelConfig from "../database/LevelConfig.js";
import { GetGuild, GetSpecialChannel, GetTotalInvites } from "./ClientUtils.js";
import CreateEmbed from "./CreateEmbed.js";
import gibDetect from "./GibberishDetector/gibDetect.js";
import ManageRole from "./ManageRole.js";

// https://www.desmos.com/calculator/wkbcatlf9h

const inviteCache = new Cache<string, number>();

/**
 * A function for getting the xp from a message.
 * @param message The message to extract the xp from.
 * @returns The amount of xp gained from the message.
 */
async function GetXPFromMessage(message: Message<true>) {
    if (!message.member) {
        return;
    }

    // get the content without whitespace
    const content = message.content.replaceAll(/\s/gu, "");

    // check if the message is gibberish
    if (!gibDetect(content)) {
        return 0;
    }

    // get invite count
    let inviteCount = inviteCache.get(message.author.id);
    if (!inviteCount) {
        inviteCount = inviteCache.set(message.author.id, await GetTotalInvites(message.author.id));
    }

    const totalMultiplier = 1 + inviteCount * 0.03;

    // calculate the xp gained from the message
    const levelConfig = await GetLevelConfig(message.author.id);
    const xp = LengthToXP(content.length, XPToLevel(levelConfig.xp)) * totalMultiplier;
    if (xp === 0) {
        return 0;
    }

    // now add it to the user
    AddXPToUser(levelConfig, xp, message.url, message.member);

    return xp;
}

/**
 * A function for adding xp to the user (and automatically leveling them up if they've reached the new level).
 * @param levelConfig The level config of the user.
 * @param xp The xp to add - not sanitised, so make sure it's a whole number.
 * @param messageUrl The URL of the message that leveled up the user.
 */
function AddXPToUser(levelConfig: IDBLevel, xp: number, messageUrl: string, member: GuildMember) {
    LevelConfig.findOneAndUpdate({ _id: levelConfig._id }, { $inc: { xp: Math.floor(xp) } }, { new: true }).then((levelConfig) => {
        if (!levelConfig) {
            // this should absolutely NEVER happen, but Murphy's law exists
            return;
        }

        // We leveled up!
        if (XPToLevel(levelConfig.xp) > XPToLevel(levelConfig.xp - xp)) {
            const newLevel = XPToLevel(levelConfig.xp);
            const newRole = ManageLevelRole(member, newLevel);
            AlertMember(member, newLevel, messageUrl, newRole);
        }
    });
}

/**
 * Update a user's level role.
 * @param member The member to update.
 * @param memberLevel The level of the user.
 * @return The role id that was added, undefined if no role was added.
 */
function ManageLevelRole(member: GuildMember, memberLevel: number) {
    // get the role that the user should have
    const levelRole = config.LevelRoles.find((role) => role.level == memberLevel);
    if (!levelRole) {
        return;
    }

    // get the current level role id that the user has
    const currRole = config.LevelRoles.filter((role) => member.roles.cache.has(role.id)).at(-1);

    if (currRole) {
        ManageRole(member, currRole.id, "Remove", "level up");
    }
    ManageRole(member, levelRole.id, "Add", "level up");

    return levelRole.id;
}

/**
 * Get the level config of a user.
 * @param userId The user id.
 * @returns The level config object of the user.
 */
async function GetLevelConfig(userId: string) {
    let levelConfig = await LevelConfig.findOne({ userId });
    if (!levelConfig) {
        levelConfig = await LevelConfig.create({
            userId
        });
    }
    return levelConfig;
}

/**
 * A function for alerting a member that they've leveled up.
 * @param member The member to alert.
 * @param newlevel The member's new level.
 * @param messageUrl The message that made the member level up.
 * @param newRole The role id that was added to the user.
 */
async function AlertMember(member: GuildMember, newlevel: number, messageUrl: string, newRole: string | null = null) {
    let embedDescription = `**Congratulations ${member}, you've successfully achieved level ${newlevel}**! ([Jump to level message](${messageUrl}))`;

    // if newRole is not null, get the role name
    if (newRole) {
        const roleName = await GetGuild()
            .roles.fetch(newRole)
            .then((role) => role?.name ?? "Unknown role");

        embedDescription += `\nAs a reward of your hard work, you've been given the **${roleName}** role!`;
    }

    // create embed
    const alertembed = CreateEmbed(embedDescription, {
        color: "success"
    });

    GetSpecialChannel("LevelUp").send({
        content: spoiler(`<@${member.id}>`),
        embeds: [alertembed]
    });
}

const lbPosCache = new Cache<string, number>();

export async function GetLeaderboardPos(userId: string) {
    if (lbPosCache.has(userId)) {
        return lbPosCache.get(userId) as number;
    } else {
        await RefreshLeaderboardPos();
        return lbPosCache.get(userId) ?? 0;
    }
}

/**
 * Refresh the leaderboard positions
 */
export async function RefreshLeaderboardPos() {
    return LevelConfig.aggregate([
        { $sort: { xp: -1 } }, // Sort documents by xp in descending order
        { $group: { _id: undefined, userIds: { $push: "$userId" } } } // Create an array of user IDs
    ])
        .exec()
        .then((pos) => {
            const userIds = pos[0].userIds as string[];
            for (const userId of userIds) {
                const userIndex = userIds.indexOf(userId);

                lbPosCache.set(userId, userIndex + 1);
            }
        })
        .catch((err) => console.warn(`Failed to refresh leaderboard position: ${err}`));
}

function RefreshLeaderboardPosSync() {
    RefreshLeaderboardPos();
}

// refresh leaderboard positions every 5 minutes
setInterval(RefreshLeaderboardPosSync, 5 * 60 * 1000);
RefreshLeaderboardPos();

export { GetLevelConfig, GetXPFromMessage, AddXPToUser };