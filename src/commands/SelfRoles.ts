import { GuildMember } from "discord.js";
import config from "../config.js";
import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import ManageRole from "../util/ManageRole.js";

const SelfRolesCommand: SlashCommand = {
    name: "selfroles",

    async runStringSelectMenu(interaction, client) {
        const selection = interaction.values[0];

        const roleId = {
            "botupdate": config.roles.BotUpdatePing,
            "announcement": config.roles.AnnouncementPing,
            "giveaway": config.roles.GiveawayPing
        }[selection];

        if (!roleId) throw new Error("Incorrect selection, which should not be possible");

        const target = interaction.member as GuildMember;
        const hasRole = target.roles.cache.has(roleId);

        if (hasRole) ManageRole(target, roleId, "Remove");
        else ManageRole(target, roleId, "Add");

        const embed = CreateEmbed(`**Successfully ${hasRole ? "removed" : "added"} <@&${roleId}>**`);

        interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    },
};

export default SelfRolesCommand;