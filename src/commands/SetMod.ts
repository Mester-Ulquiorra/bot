import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js";
import { logger } from "../Ulquiorra.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import ManageRole from "../util/ManageRole.js";
import { CanManageUser, ModName, ModNameToId, ModNameToLevel } from "../util/ModUtils.js";
const SetModCommand: SlashCommand = {
    name: "setmod",

    async run(interaction: ChatInputCommandInteraction, _client: Client) {
        const target = interaction.options.getMember("member") as GuildMember;
        if (!target) return "The member has left the server";

        const modLevel = interaction.options.getInteger("modlevel");
        const reason = interaction.options.getString("reason") ?? "no reason provided";

        const userConfig = await GetUserConfig(interaction.user.id, "changing mod level of user");
        const targetConfig = await GetUserConfig(target.id, "changing mode level of user");

        if (!CanManageUser(userConfig, targetConfig) || userConfig.mod < ModNameToLevel("Head"))
            return GetError("BadUser");

        if (modLevel >= userConfig.mod)
            return GetError("BadValue", "modlevel");

        targetConfig.mod = modLevel;
        await targetConfig.save();

        SetModRole(target, modLevel);

        logger.log(`Mod level of ${target.user.tag} (${target.id}) has been set to ${modLevel} by ${interaction.user.tag} (${interaction.user.id})`);

        const returnEmbed = CreateEmbed(
            `**${target}'s mod level has been set to ${modLevel}**`,
            { color: "success" }
        ).addFields([{ name: "Reason", value: reason, inline: true }]);

        const userEmbed = CreateEmbed(
            `**Your mod level has been set to ${modLevel} by ${interaction.user}**`,
            { color: "success" }
        ).addFields([{ name: "Reason", value: reason, inline: true }]);

        interaction.reply({ embeds: [returnEmbed], ephemeral: true });
        target.send({ embeds: [userEmbed] }).catch(() => { return; });
    }
};

/**
 *
 * @param member The member to change the roles of.
 * @param modLevel The modlevel to set the member to.
 */
export async function SetModRole(member: GuildMember, modLevel: number) {
    // remove head and test mod role
    if (modLevel !== ModNameToLevel("Head")) ManageRole(member, ModNameToId("Head"), "Remove");
    if (modLevel !== ModNameToLevel("Test")) ManageRole(member, ModNameToId("Test"), "Remove");
    if (modLevel <= 0 || modLevel >= ModNameToLevel("Head")) ManageRole(member, ModNameToId("Base"), "Remove");

    // go through basemod names and remove all roles
    for (const modName of ["Level 1", "Level 2", "Level 3"] as ModName[]) {
        if (modLevel !== ModNameToLevel(modName)) await ManageRole(member, ModNameToId(modName), "Remove");
    }

    // if modlevel is between 1 and 3 add the normal mod role
    if (modLevel >= 1 && modLevel < ModNameToLevel("Head")) {
        ManageRole(member, ModNameToId("Base"), "Add");
    }

    // now that we've fucked up the roles, we need to add the correct ones
    switch (modLevel) {
        case 1:
            ManageRole(member, ModNameToId("Level 1"), "Add");
            break;
        case 2:
            ManageRole(member, ModNameToId("Level 2"), "Add");
            break;
        case 3:
            ManageRole(member, ModNameToId("Level 3"), "Add");
            break;
        case 4:
            ManageRole(member, ModNameToId("Head"), "Add");
            break;
        case -1:
            ManageRole(member, ModNameToId("Test"), "Add");
            break;
    }
}

export default SetModCommand;