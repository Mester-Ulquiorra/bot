import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, User } from "discord.js";
import config from "../config.js";
import { PunishmentType } from "../database/PunishmentConfig.js";
import UserConfig from "../database/UserConfig.js";
import { DBPunishment, DBUser } from "../types/Database.js";
import CreateEmbed, { EmbedColor } from "./CreateEmbed.js";

const userSchema = UserConfig.schema.obj;

export enum ModType {
    Base = 0,
    Level1 = 1,
    Level2 = 2,
    Level3 = 3,
    Head = 4,
    Admin = 5,
    Test = -1
}

export type ModName = "Base" | "Level 1" | "Level 2" | "Level 3" | "Head" | "Admin" | "Owner" | "Test";

/**
 * A map of the mod role ids.
 */
const ModRoleIds = new Map<ModType, string>([
    [ModType.Base, "812701332250951682"],
    [ModType.Level1, "977969136216993883"],
    [ModType.Level2, "977969134442790982"],
    [ModType.Level3, "977969128071651368"],
    [ModType.Head, "846696368419373057"],
    [ModType.Admin, "835532621664354404"],
    [ModType.Test, "985576003969646634"],
]);

export const ModLevelToName = function (level: number): string {
    switch (true) {
        case level === -1: return "Test mod";
        case level >= ModType.Level1 && level <= ModType.Level3: return "Mod";
        case level === ModType.Head: return "Head mod";
        case level === ModType.Admin: return "Admin";
        case level === 6: return "Owner";
        default: return "Member";
    }
};

/**
 * A function to convert a mod name to a level as a number
 */
export const ModNameToLevel = function (name: ModName): number {
    switch (name) {
        case "Base":
        case "Level 1": return 1;
        case "Level 2": return 2;
        case "Level 3": return 3;
        case "Head": return 4;
        case "Admin": return 5;
        case "Owner": return 6;
        case "Test": return -1;
    }
};

/**
 * A function to connvert a mod name to the role id
 */
export const ModNameToId = function (name: ModType): string {
    return ModRoleIds.get(name);
};

export const CanManageUser = function (user: DBUser, target: DBUser): boolean {
    if (user.mod == 0) return false;
    if (user.userId == target.userId) return false;
    if (target.mod != 0 && user.mod < ModNameToLevel("Head")) return false;
    if (user.mod <= target.mod) return false;

    return true;
};

/**
 * A map to hold all the max mutes.
 */
const maxMutes = new Map(
    config.MaxMutes.map((object) => {
        return [object.mod, object.duration];
    })
);

/**
 * A map to hold all the max bans.
 */
const maxBans = new Map(
    config.MaxBans.map((object) => {
        return [object.mod, object.duration];
    })
);

export const CanPerformPunishment = function (user: DBUser, punishmentType: PunishmentType, duration: number) {
    if (user.mod >= ModNameToLevel("Head") || user.mod === ModNameToLevel("Test")) return true;

    if (punishmentType === PunishmentType.Kick || punishmentType === PunishmentType.Warn) return true;

    if (duration === -1) return false;

    const checkDuration = punishmentType === PunishmentType.Mute ? maxMutes.get(user.mod) : maxBans.get(user.mod);
    return (checkDuration !== 0 && checkDuration >= duration);
};

interface CreateModEmbedOptions {
    anti?: boolean,
    backupType?: number,
    userEmbed?: boolean,
    detail?: string,
    reason?: string
}

/**
 * A function for turning a punishmentType into "muted", "unbanned", "kicked" etc.
 */
function getModActionName(punishmentType: number, anti = false) {
    const base = anti ? "un" : "";
    switch (punishmentType) {
        case PunishmentType.Warn: return "warned";
        case PunishmentType.Mute: return base + "muted";
        case PunishmentType.Ban: return base + "banned";
        case PunishmentType.Kick: return base + "kicked";
        default: return "#error#";
    }
}

/**
 * A function for adding the "Muted until", "Banned until" field to an embed
 */
function addDurationField(embed: EmbedBuilder, punishmentType: number, actionName: string, until: number) {
    if (punishmentType !== PunishmentType.Ban && punishmentType !== PunishmentType.Mute) return;
    embed.addFields([{
        // uppercase the first letter of the mod action
        name: actionName.charAt(0).toUpperCase() + actionName.slice(1) + " until",
        value: until === -1 ? "Permanent" : `<t:${until}>`,
        inline: true
    }]);
}

/**
 * A function for creating an universal mod embed
 */
export const CreateModEmbed = function (mod: User, target: User | string, punishment: DBPunishment, options?: CreateModEmbedOptions) {
    // first get a string representation of the action
    const modActionName = getModActionName(punishment?.type ?? options?.backupType, options?.anti);

    const targetString = typeof target === "string" ? `<@${target}>` : target.toString();

    const embed = CreateEmbed(
        // if it's a user embed, replace the member with "you"
        options?.userEmbed
            ? `**You have been ${modActionName} by ${mod}!**`
            : `**${targetString} has been ${modActionName} by ${mod}!**`,
        { color: options?.userEmbed ? EmbedColor.Info : EmbedColor.Success }
    );

    // if this is an anti punishment, and there is an explicit reason given, add it
    if (options?.anti && options?.reason)
        embed.addFields([{ name: "Reason", value: options.reason, inline: false }]);

    // now add the "real" reason, but call it "Original reason", if this is an anti punishment
    embed.addFields([{
        name: options?.anti ? "Original reason" : "Reason",
        value: punishment?.reason ?? "#unknown#",
        inline: false
    }]);

    // set the footer to the punishment id
    const footer = `Punishment ID: ${punishment?.punishmentId ?? "#unknown#"} ` + ((punishment.automated && options?.userEmbed && !options?.anti) ? "(this is an automated punishment, false positives might occur)" : "");
    embed.setFooter({ text: footer });

    // we're done with the basic stuff, but if this is an anti punishment, we also need to add the original moderator
    if (options?.anti) {
        embed.addFields([{
            name: "Original moderator",
            value: punishment == null ? "#unknown#" : `<@${punishment.mod}>`,
            inline: true
        }]);
        return embed;
    }

    // now add the duration
    addDurationField(embed, punishment?.type, modActionName, punishment?.until ?? -1);

    // if detail is set, add it
    if (options?.detail && !options?.userEmbed)
        embed.addFields([{ name: "Details", value: options?.detail, inline: false }]);

    return embed;
};

export const CreateAppealButton = function (isBan = false) {
    return !isBan ?
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("appeal.appeal")
                .setLabel("Appeal your punishment")
                .setStyle(ButtonStyle.Primary)
        ).toJSON()
        :
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel("Join Mester's Prison to get access to the appeal button")
                .setStyle(ButtonStyle.Link)
                .setURL(config.PrisonInvite)
        ).toJSON();
};