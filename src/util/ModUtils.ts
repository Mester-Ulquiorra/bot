import { ActionRowBuilder, APIActionRowComponent, APIButtonComponent, ButtonBuilder, ButtonStyle, EmbedBuilder, User } from "discord.js";
import config from "../config.js";
import { PunishmentType } from "../database/PunishmentConfig.js";
import { DBPunishment, DBUser } from "../types/Database.js";
import CreateEmbed, { EmbedColor } from "./CreateEmbed.js";

enum ModLevel {
    Level1 = 1,
    Level2,
    Level3,
    Head,
    Admin,
    Owner,
    Test = -1
}

export type ModName = "Base" | "Level 1" | "Level 2" | "Level 3" | "Head" | "Admin" | "Owner" | "Test";

/**
 * Convert a mod level to its string representation
 * @param level The level of the mod as a number
 * @returns The string representation of that mod level
 */
export function ModLevelToName(level: ModLevel) {
    switch (true) {
        case level === ModLevel.Test: return "Test mod";
        case level >= ModLevel.Level1 && level <= ModLevel.Level3: return "Mod";
        case level === ModLevel.Head: return "Head mod";
        case level === ModLevel.Admin: return "Admin";
        case level === ModLevel.Owner: return "Owner";
        default: return "Member";
    }
}

/**
 * A function to convert a mod name to a level as a number
 */
export function ModNameToLevel(name: ModName) {
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
}

/**
 * A function to convert a mod name to the role id
 */
export function ModNameToId(name: ModName) {
    return config.ModRoleIds.get(name);
}

export function CanManageUser(user: DBUser, target: DBUser) {
    if (user.mod === 0) return false;
    if (user.userId == target.userId) return false;
    if (target.mod !== 0 && user.mod < ModNameToLevel("Head")) return false;
    if (user.mod <= target.mod) return false;

    return true;
}

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

export function CanPerformPunishment(user: DBUser, punishmentType: PunishmentType, duration: number) {
    if (user.mod >= ModNameToLevel("Head") || user.mod === ModNameToLevel("Test")) return true;

    if (punishmentType === PunishmentType.Kick || punishmentType === PunishmentType.Warn) return true;

    if (duration === -1) return false;

    const checkDuration = punishmentType === PunishmentType.Mute ? maxMutes.get(user.mod) : maxBans.get(user.mod);
    return (checkDuration !== 0 && checkDuration >= duration);
}

interface CreateModEmbedOptions<T extends boolean, U extends boolean> {
    anti?: U,
    backupType?: number,
    userEmbed?: T,
    detail?: string,
    reason?: string,
    requestID?: string,
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
    embed.addFields({
        // uppercase the first letter of the mod action
        name: actionName.charAt(0).toUpperCase() + actionName.slice(1) + " until",
        value: until === -1 ? "Permanent" : `<t:${until}>`,
        inline: true
    });
}

type ModEmbed<T extends boolean, U extends boolean> = T extends true ? (U extends false ? { embed: EmbedBuilder, components: APIActionRowComponent<APIButtonComponent>[] } : EmbedBuilder) : EmbedBuilder;
/**
 * A function for creating an universal mod embed
 */
export function CreateModEmbed<T extends boolean = false, U extends boolean = false>(mod: User, target: User | string, punishment: DBPunishment, options: CreateModEmbedOptions<T, U> = {}): ModEmbed<T, U> {
    // first get a string representation of the action
    const modActionName = getModActionName(punishment?.type ?? options.backupType, options.anti);

    const targetString = typeof target === "string" ? `<@${target}>` : target.toString();

    const embed = CreateEmbed(
        // if it's a user embed, replace the member with "you"
        options.userEmbed
            ? `**You have been ${modActionName} by ${mod}!**`
            : `**${targetString} has been ${modActionName} by ${mod}!**`,
        { color: options.userEmbed ? EmbedColor.Info : EmbedColor.Success }
    );

    // if this is an anti punishment, and there is an explicit reason given, add it
    if (options.anti && options.reason)
        embed.addFields({ name: "Reason", value: options.reason, inline: false });

    // now add the "real" reason, but call it "Original reason", if this is an anti punishment
    embed.addFields({
        name: options.anti ? "Original reason" : "Reason",
        value: punishment?.reason ?? "#unknown#",
        inline: false
    });

    // set the footer to the punishment id
    const footer = `Punishment ID: ${punishment?.punishmentId ?? "#unknown#"} ` + ((punishment.automated && options.userEmbed && !options.anti) ? "(this is an automated punishment, false positives might occur)" : "");
    embed.setFooter({ text: footer });

    // we're done with the basic stuff, but if this is an anti punishment, we also need to add the original moderator
    if (options.anti) {
        embed.addFields({
            name: "Original moderator",
            value: punishment == null ? "#unknown#" : `<@${punishment.mod}>`,
            inline: true
        });

        return <ModEmbed<T, U>>embed;
    }

    // now add the duration
    addDurationField(embed, punishment?.type, modActionName, punishment?.until ?? -1);

    // if detail is set, add it
    if (options.detail && !options.userEmbed)
        embed.addFields({ name: "Details", value: options.detail, inline: false });

    const components = [CreateAppealButton(punishment.type === PunishmentType.Ban)];
    if (options.userEmbed) {
        if(options.requestID) components.push(CreateAutomodReasonButton(options.requestID));
        return <ModEmbed<T, U>>{ embed, components };
    }
    else return <ModEmbed<T, U>>embed;
}

export function CreateAppealButton(isBan = false) {
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
}

function CreateAutomodReasonButton(requestID) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`automod.reason-${requestID}`)
            .setLabel("Show reason")
            .setStyle(ButtonStyle.Primary)
    ).toJSON();
}