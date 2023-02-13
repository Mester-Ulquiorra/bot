import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import config from "../config.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetGuild } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import Log from "../util/Log.js";
import { ModNameToLevel } from "../util/ModUtils.js";

const LockCommand: SlashCommand = {
    name: "lock",

    async run(interaction, _client) {
        // get the reason for the lock
        let reason = interaction.options.getString("reason") ?? "no reason provided";

        // check if the user is trying to (un)lock all channels
        // also fix the reason not being correct
        const lock_all = reason.startsWith("*");
        if (lock_all)
            reason = reason.substring(1) || "no reason provided";

        const unlock = interaction.options.getSubcommand() === "unlock";

        // get the user's config
        const userConfig = await GetUserConfig(interaction.user.id);

        // only head mods and higher can lock channels
        // only admins can lock all channels
        if (userConfig.mod < ModNameToLevel("Head"))
            return GetError("Permission");

        if (userConfig.mod < ModNameToLevel("Admin") && lock_all)
            return GetError("Permission");

        const interactionChannel = interaction.channel;

        // check if channel is a text channel
        if (interactionChannel.isDMBased() || interactionChannel.isThread())
            return "This command can only be used in text channels.";

        if (lock_all) {
            // fetch all channels that are in the all lock id array
            const channelsToLock = (await GetGuild().channels.fetch()).filter(
                (channel) => config.channels.LockAllIds.includes(channel.id)
            );

            for (const [_, channel] of channelsToLock) {
                lockOne(channel as TextChannel, !unlock, reason, interaction);
            }

            Log(`${interaction.user.tag} has (${interaction.user.id}) ${unlock ? "un" : ""}locked ALL channels. Reason: ${reason}`);

            // delete the interaction
            interaction.deferReply().then(() => interaction.deleteReply());

            return;
        }

        // --- This part is for a single channel only ---

        // do the lock
        lockOne(interactionChannel as TextChannel, !unlock, reason, interaction);

        // log
        Log(`${interaction.user.tag} (${interaction.user.id}) has ${unlock ? "un" : ""}locked channel ${interactionChannel.name} (${interactionChannel.id}). Reason: ${reason}`);

        // delete the interaction
        interaction.deferReply().then(() => interaction.deleteReply());
    }
};

/**
 * A function for doing every neccessary stuff (locking, sending embed etc.) for a single channel
 */
async function lockOne(channel: TextChannel, lock: boolean, reason: string, interaction: ChatInputCommandInteraction) {
    // now let's lock
    lockChannel(channel, interaction, lock);

    // create the embed
    const embed = CreateEmbed(
        `🔒 The channel has been ${!lock ? "un" : ""}locked by ${interaction.user
        }: **${reason}**`,
        { color: lock ? EmbedColor.Error : EmbedColor.Success }
    );

    // send the embed
    channel.send({ embeds: [embed] });
}

async function lockChannel(channel: TextChannel, interaction: ChatInputCommandInteraction, lock = true,) {
    return channel.permissionOverwrites.edit(config.roles.Everyone, {
        SendMessages: lock ? false : null,
        SendMessagesInThreads: lock ? false : null,
    }, {
        reason: `Channel ${lock ? "" : "un"}locked by ${interaction.user.tag}`
    });
}

export default LockCommand;