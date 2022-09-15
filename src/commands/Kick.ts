import { GuildMember } from "discord.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig";
import SlashCommand from "../types/SlashCommand";
import { SnowFlake } from "../Ulquiorra";
import { GetSpecialChannel } from "../util/ClientUtils";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed from "../util/CreateEmbed";
import GetError from "../util/GetError";
import Log from "../util/Log";
import { CanManageUser, CreateModEmbed } from "../util/ModUtils";

const KickCommand: SlashCommand = {
    name: "kick",

    async run(interaction, _client) {
        const target = interaction.options.getMember("member") as GuildMember;
        const reason = interaction.options.getString("reason") ?? "no reason provided";

        const userConfig = await GetUserConfig(interaction.user.id);
        const targetConfig = await GetUserConfig(target.id);

        if (!CanManageUser(userConfig, targetConfig) || target.user.bot || !target.kickable) return GetError("BadUser");

        // create a snowflake for the punishment
        const punishmentId = SnowFlake.getUniqueID().toString();

        // create the punishment
        const punishment = await PunishmentConfig.create({
            id: punishmentId,
            user: target.id,
            mod: interaction.user.id,
            type: PunishmentType.Kick,
            reason: reason,
            at: Math.floor(Date.now() / 1000),
            active: false,
        });

        Log(`${target.user.tag} (${target.id}) has been kicked by ${interaction.user.id} (${interaction.user.id}): ${reason}. ID: ${punishmentId}`);

        const modEmbed = CreateModEmbed(interaction.user, target.user, punishment);
        const userEmbed = CreateModEmbed(interaction.user, target.user, punishment, { userEmbed: true });
        const channelEmbed = CreateEmbed(`${target} has been kicked: **${reason}**`);

        target
            .send({ embeds: [userEmbed] })
            .catch(() => { return; })
            .finally(() => {
                target.kick(`Kicked by ${interaction.user.tag}: ${reason}`).catch(() => { return "Couldn't kick member" });
            });

        interaction.channel.sendTyping().then(() => {
            interaction.channel.send({ embeds: [channelEmbed] });
        })

        GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });

        interaction.reply({ embeds: [modEmbed], ephemeral: true })
    }
}

export default KickCommand;