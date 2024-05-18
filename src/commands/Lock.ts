import { AnyThreadChannel, ChatInputCommandInteraction, GuildTextBasedChannel, TextChannel } from "discord.js";
import { logger } from "../Ulquiorra.js";
import config from "../config.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetGuild } from "../util/ClientUtils.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import { ModNameToLevel } from "../util/ModUtils.js";

const LockCommand: SlashCommand = {
    name: "lock",

    async run(interaction) {
        if (!interaction.inGuild()) {
            return GetError("GuildOnly");
        }

        // get the reason for the lock
        let reason = interaction.options.getString("reason") ?? "no reason provided";

        // check if the user is trying to (un)lock all channels
        // also fix the reason not being correct
        const lockAllRequested = reason.startsWith("*");
        if (lockAllRequested) {
            reason = reason.substring(1) || "no reason provided";
        }

        /**
         * If this is true, the user wants to lock channels, otherwise they want to unlock them.
         */
        const lockRequested = interaction.options.getSubcommand() !== "unlock";

        // get the user's config
        const userConfig = await GetUserConfig(interaction.user.id, "locking channel");

        // only head mods and higher can lock channels
        // only admins can lock all channels
        if (userConfig.mod < ModNameToLevel("Head")) {
            return GetError("Permission");
        }

        if (userConfig.mod < ModNameToLevel("Admin") && lockAllRequested) {
            return GetError("Permission");
        }

        const interactionChannel = interaction.channel;
        if (!interactionChannel) {
            return "Interaction doesn't have a channel? wtf??";
        }

        // check if channel is a text channel
        if (!interactionChannel.isTextBased() || interactionChannel.isThread()) {
            return "This command can only be used in text channels which are not threads.";
        }

        if (lockAllRequested) {
            return lockAll(lockRequested, reason, interaction);
        }

        // --- This part is for a single channel only ---

        // do the lock
        lockOne(interactionChannel, lockRequested, reason, interaction);

        // log
        logger.log(
            `${interaction.user.tag} (${interaction.user.id}) has ${lockRequested ? "" : "un"}locked channel ${interactionChannel.name} (${
                interactionChannel.id
            }). Reason: ${reason}`
        );

        // delete the interaction
        interaction.deferReply().then(() => interaction.deleteReply());
    }
};

type LockableChannel = Exclude<GuildTextBasedChannel, AnyThreadChannel>;

/**
 * (Un)lock all channels defined in the config.
 */
async function lockAll(unlock: boolean, reason: string, interaction: ChatInputCommandInteraction) {
    // fetch all channels that are in the all lock id array
    const channelsToLock = (await GetGuild().channels.fetch()).filter((channel) => channel && config.channels.LockAllIds.includes(channel.id));

    for (const [, channel] of channelsToLock) {
        lockOne(channel as TextChannel, !unlock, reason, interaction);
    }

    logger.log(`${interaction.user.tag} has (${interaction.user.id}) ${unlock ? "un" : ""}locked ALL channels. Reason: ${reason}`);

    // delete the interaction
    interaction.deferReply().then(() => interaction.deleteReply());
}

/**
 * A function for doing every neccessary stuff (locking, sending embed etc.) for a single channel
 */
async function lockOne(channel: LockableChannel, lock: boolean, reason: string, interaction: ChatInputCommandInteraction) {
    // now let's lock
    lockChannel(channel, interaction, lock);

    // create the embed
    const embed = CreateEmbed(`🔒 The channel has been ${!lock ? "un" : ""}locked by ${interaction.user}: **${reason}**`, {
        color: lock ? "error" : "success"
    });

    // send the embed
    channel.send({ embeds: [embed] });
}

async function lockChannel(channel: LockableChannel, interaction: ChatInputCommandInteraction, lock = true) {
    return channel.permissionOverwrites.edit(
        config.roles.Everyone,
        {
            SendMessages: lock ? false : null,
            SendMessagesInThreads: lock ? false : null
        },
        {
            reason: `Channel ${lock ? "" : "un"}locked by ${interaction.user.tag}`
        }
    );
}

export default LockCommand;
