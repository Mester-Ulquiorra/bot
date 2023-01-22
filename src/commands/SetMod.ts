import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import ManageRole from "../util/ManageRole.js";
import { CanManageUser, ModNameToId, ModNameToLevel, ModType } from "../util/ModUtil.js";

const SetModCommand: SlashCommand = {
    name: "setmod",

    async run(interaction: ChatInputCommandInteraction, _client: Client) {
        const target = interaction.options.getMember("member") as GuildMember;
        if (!target) return "The member has left the server";

        const modLevel = interaction.options.getInteger("modlevel");
        const reason = interaction.options.getString("reason") ?? "no reason provided";

        const userConfig = await GetUserConfig(interaction.user.id);
        const targetConfig = await GetUserConfig(target.id);

        if (!CanManageUser(userConfig, targetConfig) || userConfig.mod < ModNameToLevel("Head"))
            return GetError("BadUser");

        if (modLevel >= userConfig.mod)
            return GetError("Value", "modlevel");

        targetConfig.mod = modLevel;
        await targetConfig.save();

        SetModRole(target, modLevel);

        Log(`Mod level of ${target.user.tag} (${target.id}) has been set to ${modLevel} by ${interaction.user.tag} (${interaction.user.id})`);

        const returnEmbed = CreateEmbed(
            `**${target}'s mod level has been set to ${modLevel}**`,
            { color: EmbedColor.Success }
        ).addFields([{ name: "Reason", value: reason, inline: true }]);

        const userEmbed = CreateEmbed(
            `**Your mod level has been set to ${modLevel} by ${interaction.user}**`,
            { color: EmbedColor.Success }
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
async function SetModRole(member: GuildMember, modLevel: number) {
    // remove head and test mod role
    if (modLevel !== ModNameToLevel("Head")) ManageRole(member, ModNameToId(ModType.Head), "Remove");
    if (modLevel !== ModNameToLevel("Test")) ManageRole(member, ModNameToId(ModType.Test), "Remove");
    if (modLevel <= 0 || modLevel >= ModNameToLevel("Head")) ManageRole(member, ModNameToId(ModType.Base), "Remove");

    // go through basemod names and remove all roles
    for (const modName of [1, 2, 3]) {
        if (modLevel !== modName) await ManageRole(member, ModNameToId(modName), "Remove");
    }

    // if modlevel is between 1 and 3 add the normal mod role
    if (modLevel >= 1 && modLevel < ModNameToLevel("Head")) {
        ManageRole(member, ModNameToId(ModType.Base), "Add");
    }

    // now that we've fucked up the roles, we need to add the correct ones
    switch (modLevel) {
        case 1:
            ManageRole(member, ModNameToId(ModType.Level1), "Add");
            break;
        case 2:
            ManageRole(member, ModNameToId(ModType.Level2), "Add");
            break;
        case 3:
            ManageRole(member, ModNameToId(ModType.Level3), "Add");
            break;
        case 4: // head
            ManageRole(member, ModNameToId(ModType.Head), "Add");
            break;
        case -1: // test
            ManageRole(member, ModNameToId(ModType.Test), "Add");
            break;
    }
}


export default SetModCommand;