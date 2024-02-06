import { VoiceState } from "discord.js";
import Event from "../types/Event.js";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";

const VoiceStateUpdateEvent: Event = {
    name: "voiceStateUpdate",

    async run(client, oldState: VoiceState, newState: VoiceState) {
        // create embed for voice channel change logging
        const oldChannel = oldState.channelId ? await GetGuild().channels.fetch(oldState.channelId) : null;
        const newChannel = newState.channelId ? await GetGuild().channels.fetch(newState.channelId) : null;

        // the channel might not change
        if (oldChannel?.id === newChannel?.id) {
            return;
        }

        const embed = CreateEmbed(`${oldState.member} has switched voice channels`)
            .addFields(
                {
                    name: "Previous channel",
                    value: oldChannel?.toString() || "nothing",
                    inline: true
                },
                {
                    name: "New channel",
                    value: newChannel?.toString() || "nothing",
                    inline: true
                }
            )
            .setThumbnail(oldState.member?.displayAvatarURL() || null);

        GetSpecialChannel("MiscLog").send({ embeds: [embed] });
    }
};

export default VoiceStateUpdateEvent;
