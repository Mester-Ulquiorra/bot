import { PunishmentType } from "@mester-ulquiorra/commonlib";
import { ChatInputCommandInteraction, Client, GuildMember } from "discord.js";
import { SnowFlake, logger } from "../Ulquiorra.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetSpecialChannel } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { CanManageUser, CreateModEmbed } from "../util/ModUtils.js";

const WarnCommand: SlashCommand = {
    name: "warn",

    run: async (interaction: ChatInputCommandInteraction, _client: Client) => {
        /**
         * The user we want to warn
         */
        const target = interaction.options.getMember("member") as GuildMember;
        if (!target) return "That member is not in the server anymore";

        const reason = interaction.options.getString("reason") ?? "no reason provided";

        const userConfig = await GetUserConfig(interaction.user.id, "warning a user");
        const targetConfig = await GetUserConfig(target.id, "warning a user");

        if (!CanManageUser(userConfig, targetConfig) || target.user.bot) return GetError("BadUser");

        // we are past the checks, let's do this

        const punishmentId = SnowFlake.getUniqueID().toString();

        const punishment = await PunishmentConfig.create({
            punishmentId: punishmentId,
            type: PunishmentType.Warn,
            user: target.id,
            mod: interaction.user.id,
            reason,
            at: Math.floor(Date.now() / 1000),
            active: false
        });

        logger.log(`${target.user.tag} (${target.id}) has been warned by ${interaction.user.tag} (${interaction.user.id}): ${reason}. ID: ${punishmentId}`);

        // create the embeds for the warn
        const modEmbed = CreateModEmbed(interaction.user, target.user, punishment);
        const userEmbed = CreateModEmbed(interaction.user, target.user, punishment, { userEmbed: true });
        const channelEmbed = CreateEmbed(`${target} has been warned: **${reason}**`);

        // send out the embeds
        target.send({ embeds: [userEmbed.embed] }).catch(() => { return; });

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        });

        GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

        interaction.reply({ embeds: [modEmbed], ephemeral: true });
    }
};

export default WarnCommand;