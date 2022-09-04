import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonStyle, GuildMember, Message, spoiler } from "discord.js";
import config from "../config";
import LevelConfig from "../database/LevelConfig";
import test_mode from "../test_mode";
import { GetGuild, GetSpecialChannel } from "./ClientUtils";
import CreateEmbed, { EmbedColor } from "./CreateEmbed";
import Log, { LogType } from "./Log";
import { ClampNumber } from "./MathUtils";
import gib_detect from "./GibberishDetector/gib_detect"

/**
 * A map to hold all the level roles.
 */
const levelRoles = new Map(
    config.LevelRoles.map((object) => {
        return [object.level, object.id];
    })
);

const level_config = {
    /**
     * the required seconds between each message to gain xp
     */
    MESSAGE_LIMIT: 30,
    /**
     * the xp of the first level
     */
    BASE_LEVEL: 2000,
    /**
     * the xp required to get the next level
     */
    EXTRA_LEVEL: 5000,
    /**
     * how much does EXTRA_LEVEL change after each level
     */
    LEVEL_MULTIPLIER: 35,
    /**
     * the level where things change (xp cap stops decreasing etc.)
     */
    EVENT_HORIZON: 70,
    /**
     * how much should EXTRA_LEVEL decrease after level hits the event horizon
     */
    XP_DECREASE_RATE: 0.005,
    /**
     * the starting and maximum xp cap (aka. how much xp can be gained max)
     */
    MAX_XP_CAP: 2000,
    /**
     * how much should the xp cap decrease per level
     * thanks Finn for the formula
     */
    XP_CAP_MULTIPLIER: 70 / (1 - 200 / 2000),
};

/**
 * A map that holds when a user last sent a message.
 * Used to limit the xp gain rate.
 */
const lastmessages = new Map<string, number>();

/**
 * A function for getting the xp from a message.
 * @param message The message to extract the xp from.
 * @returns The amount of xp gained from the message.
 */
async function GetXPFromMessage(message: Message): Promise<number> {
    // get the content while removing gargabe (only letters and number will remain)
    const content = message.content.replaceAll(/[^a-zA-Z0-9]|\s/gu, "");

    // get the config from the map
    if (!lastmessages.has(message.author.id))
        // make sure to add the member if they aren't in the map
        lastmessages.set(message.author.id, 0);

    // get the last time the member has sent a message
    const lastmessage = lastmessages.get(message.author.id);

    // get the level config of the user
    const levelconfig = await GetLevelConfig(message.author.id);

    // check if the user has sent a message less than 30 seconds ago
    if (
        message.createdTimestamp - lastmessage <
        level_config.MESSAGE_LIMIT * 1000 &&
        !test_mode
    )
        return 0;

    // set this message to the member's last message
    lastmessages.set(message.author.id, message.createdTimestamp);

    // check if the message is gibberish
    if (!gib_detect(content)) return 0;

    // calculate the xp gained from the message
    const xp = LengthToXP(content.length, levelconfig.level);
    if (xp == 0) return null;

    // now add it to the user
    AddXPToUser(levelconfig, xp, message);

    return xp;
}

/**
 * A function for getting the max amount of xp a user can get at a certain level.
 * https://www.desmos.com/calculator/tc0f9d3wiu
 * @param level The level to get the max xp of.
 */
function MaxXPOfLevel(level: number): number {
    return ClampNumber(
        level_config.MAX_XP_CAP * (1 - level / level_config.XP_CAP_MULTIPLIER),
        200,
        level_config.MAX_XP_CAP
    );
}

/**
 * https://www.desmos.com/calculator/i2ymzwe0nb
 * @param level The level to check
 * @returns the xp required for a level
 */
function LevelToXP(level: number) {
    return level == 0
        ? 0
        : Math.floor(
            level_config.BASE_LEVEL +
            level_config.EXTRA_LEVEL *
            (level - 1) *
            (1 +
                (Math.min(
                    1 - 0.005 * (level - level_config.EVENT_HORIZON),
                    1
                ) *
                    level -
                    1) /
                level_config.LEVEL_MULTIPLIER)
        );
}

/**
 *
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
function XPToLevel(xp: number): number {
    for (let i = 0; i < 101; i++) {
        // I don't really know what I was doing here, I guess going through every level and adding its xp
        // until we hit the xp we're looking for???
        if (i == 0 && xp < LevelToXP(1)) return i;
        if (LevelToXP(i + 1) > xp && xp >= LevelToXP(i)) return i;
    }

    // this shows error if the xp is too high
    return -1;
}

/**
 * A function for getting the xp gained from a message.
 * https://www.desmos.com/calculator/agujbxkapa
 * @param length The length of the message.
 * @param level The level of the user.
 * @returns The xp gained from the message.
 */
function LengthToXP(length: number, level: number): number {
    return Math.floor(
        ClampNumber(length * (1 + level / 140), 0, MaxXPOfLevel(level))
    );
}

/**
 * A function for adding xp to the user (and automatically leveling them up if they've reached the new level).
 * @param levelconfig The level config of the user.
 * @param xp The xp to add.
 * @param message The message that was sent.
 */
async function AddXPToUser(levelconfig: any, xp: number, message: Message) {
    levelconfig.xp += xp;
    if (LevelToXP(levelconfig.level + 1) <= levelconfig.xp) {
        // we leveled up!
        levelconfig.level = XPToLevel(levelconfig.xp);
        const newRole = ManageLevelRole(message.member, levelconfig.level);

        GetGuild()
            .members
            .fetch(message.author.id)
            .then((member) => {
                // we got the member!
                AlertMember(
                    member,
                    levelconfig.level,
                    message,
                    newRole
                );
            })
            .catch(() =>
                Log(`Couldn't find user, perhaps they left?`, LogType.Warn)
            );
    }
    await levelconfig.save();
}

/**
 * A function that resets and updates a user's level role.
 * @param member The member to update.
 * @param memberLevel The level of the user.
 * @return The role id that was added.
 */
function ManageLevelRole(member: GuildMember, memberLevel: number): string | undefined {
    // check if level_roles contain memberlevel
    if (!levelRoles.has(memberLevel)) return;

    // a function to store the current level role of the user
    let storedRole: string;

    // go through level roles and find one that the user has (if there is any)
    for (const [level, id] of levelRoles) {
        // check if the user has a role with the id
        if (member.roles.cache.has(id))
            // store the role
            storedRole = id;

        // check if memberlevel is equal to level
        if (memberLevel == level) {
            // if stored_role is not null, remove the role
            // this thing completely breaks if someone somehow removes level from the user, but seriously, who is gonna do that?
            if (storedRole) member.roles.remove(storedRole);

            // now add the role
            member.roles.add(id);

            // and return the id
            return id;
        }
    }
}

/**
 * Get the level config of a user
 * @param userid The user id.
 * @returns The level config object of the user.
 */
async function GetLevelConfig(userid: string) {
    let levelConfig = await LevelConfig.findOne({ id: userid });
    if (!levelConfig)
        levelConfig = await LevelConfig.create({
            id: userid,
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
async function AlertMember(member: GuildMember, newlevel: number, message: Message, newRole: string) {
    let embedDescription = `**Congratulations <@${member.id}>! You've successfully achieved level ${newlevel}**`;

    // if new_role is not null, get the role name
    if (newRole) {
        let role_name = await GetGuild().roles
            .fetch(newRole)
            .then((role) => {
                return role.name;
            });

        embedDescription += `\nAs a reward of your hard work, you've been given the **${role_name}** role!`;
    }

    // create embed
    const alertembed = CreateEmbed(embedDescription, {
        color: EmbedColor.Success,
    }).addFields([
        {
            name: `Achieved at`,
            value: `<t:${Math.floor(message.createdTimestamp / 1000)}>`,
            inline: true,
        },
    ]);

    const components = [
        new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setEmoji("✉️")
                .setLabel("Show level message")
                .setStyle(ButtonStyle.Link)
                .setURL(message.url),
        ]).toJSON(),
    ];

    GetSpecialChannel("LevelUp")
        .send({
            content: spoiler(`<@${member.id}>`),
            embeds: [alertembed],
            components: components as APIActionRowComponent<any>[],
        });
}

export {
    GetXPFromMessage,
    LevelToXP,
    XPToLevelUp,
    XPToLevel,
    GetLevelConfig,
};