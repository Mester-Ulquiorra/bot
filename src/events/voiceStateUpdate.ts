import { VoiceState } from "discord.js";
import Event from "../types/Event.js";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
const VoiceStateUpdateEvent: Event = {
    name: "voiceStateUpdate",
    async run(_client, oldState: VoiceState, newState: VoiceState) {
        /*
        // if the oldState had a voice channel and the newState doesn't, check if we're playing music and are in the same channel
        if (oldState.channelId != null && newState.channelId == null && oldState.channelId === GetGuild().members.me.voice?.channelId) {
            // check if there are any members left
            if (GetGuild().members.me.voice?.channel.members.size === 1) {
                killMusic();
            }
        }*/

        // create embed for voice channel change logging
        const oldChannel = oldState.channelId ? GetGuild().channels.cache.get(oldState.channelId) : null;
        const newChannel = newState.channelId ? GetGuild().channels.cache.get(newState.channelId) : null;

        // the channel might not change
        if (oldChannel?.id === newChannel?.id) return;

        const embed = CreateEmbed(`${oldState.member} has switched voice channels`)
            .addFields(
                {
                    name: "Previous channel",
                    value: oldChannel != null ? oldChannel.toString() : "nothing",
                    inline: true
                },
                {
                    name: "New channel",
                    value: newChannel != null ? newChannel.toString() : "nothing",
                    inline: true
                }
            )
            .setThumbnail(oldState.member.displayAvatarURL());

        GetSpecialChannel("MiscLog").send({ embeds: [embed] });
    }
};

export default VoiceStateUpdateEvent;