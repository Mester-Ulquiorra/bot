import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import pldl from "play-dl";
import SlashCommand from "../types/SlashCommand";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";
import { CalculateMaxPage } from "../util/MathUtils";

/**
 * The player object (automatically deleted if we don't have a subscriber)
 */
let player: AudioPlayer = null;
/**
 * Which Song object we're currently playing
 */
let playing: boolean | Song = false;
/**
 * An array holding Song objects to serve as a queue
 */
let queue: Array<Song> = [];
/**
 * What type of looping is currently active. 0 = no looping, 1 = repeat one, 2 = repeat all
 */
let looptype: number = 0;
/**
 * Which song we should play in the queue
 */
let playindex: number = -1;

const MusicCommmand: SlashCommand = {
    name: "music",

    async run(interaction, _client) {
        if ((interaction.member as GuildMember).voice.channelId == null) return "You are not connected to a voice chat!";

		// check if the user is in the same voice channel
		if (interaction.guild.members.me.voice.channelId !== (interaction.member as GuildMember).voice.channelId &&
			interaction.guild.members.me.voice.channelId != null)
			return "You are not in the same voice channel with the bot."

		switch (interaction.options.getSubcommand()) {
			case "play":
				return play(interaction);
			case "skip":
				return skip(interaction);
			case "stop":
				return stop(interaction);
			case "loop":
				return loop(interaction);
			case "queue":
				return viewqueue(interaction);
			case "remove":
				return remove(interaction);
			case "pause":
				return pause(interaction);
			case "continue":
				return continueMusic(interaction);
		}
    }
}

async function play(interaction: ChatInputCommandInteraction) {
	// first check if our bot is already in a voice channel
	let connection = getVoiceConnection(interaction.guild.id);

	if (connection == undefined) {
		// we need to join the voice channel
		connection = await join(interaction);
	}

	const videoLink = interaction.options.getString("link");

	// validate link
	if ((await pldl.validate(videoLink)) == false) return "The link is invalid"

	// this should only run when the bot joins a voice channel for the first time
	// we basically initalize the player before playing the song
	if (player == null) {
		player = createAudioPlayer();

		// subscribe to our player (the player should automatically be deleted when there are no songs left in the queue)
		connection.subscribe(player);
	}

	// add the song to the queue, then start playing
	const videoEmbed = await addSong(interaction, videoLink);

	if (videoEmbed == false) return "This link type is not supported";

	interaction.editReply({ embeds: [videoEmbed.setFooter({ text: `Requested by ${interaction.user.tag}` })] });

	if (!playing) startPlaying(interaction);
}

function skip(interaction: ChatInputCommandInteraction) {
	// just to make sure, check if we're playing music
	if (!playing) return "There are currently no songs playing.";

	interaction.reply({
		embeds: [CreateEmbed(`**${(playing as Song).title}** has been skipped!`)]
	});

	// basically we just want to call startPlaying again 
	if (looptype === 1) playindex++;
	player.stop();
}

function stop(interaction: ChatInputCommandInteraction) {
	if(!playing) return "There are no songs playing right now!";
	
	const embed = CreateEmbed(`Succesfully stopped playing!`);
	interaction.reply({ embeds: [embed] });

	kill(interaction);
}

function loop(interaction: ChatInputCommandInteraction) {
	if (!playing) return "There is nothing to loop right now."

	let embedDescription = "";
	
	// set looptype based on the interaction
	switch (interaction.options.getString("looptype")) {
		case "LOOP_ALL":
			looptype = 2;
			embedDescription = "Started looping the whole queue!";
			break;
		case "LOOP_ONE":
			looptype = 1;
			embedDescription = "Started looping one song!"
			break;
		case "NO_LOOP":
			looptype = 0;
			embedDescription = "Stopped looping!"
			break;
	}

	const embed = CreateEmbed(embedDescription);

	interaction.reply({ embeds: [embed] });
}

function viewqueue(interaction: ChatInputCommandInteraction) {
	if (queue.length === 0) return "There is nothing in the queue";

	const page = interaction.options.getInteger("page") ?? 1;

	const maxPage = CalculateMaxPage(queue.length, 10)

	// check if that page is allowed
	if (page > maxPage) return "That page does not exist!";

	const startIndex = (page - 1) * 10;

	const embed = CreateEmbed(`**Song queue of ${interaction.guild.name}** (${page} / ${maxPage})! `);

	for (let i = startIndex; i < startIndex + 10 && i < queue.length; i++) {
		const video = queue[i];
		embed.addFields([{
			name: `${i + 1}.` + (playindex === i ? " Now playing" : ""),
			value: video.title,
			inline: false
		}]);
	}

	interaction.reply({
		embeds: [embed],
		ephemeral: true
	})
}

function remove(interaction: ChatInputCommandInteraction) {
    // get the index we want to remove
    const removeIndex = interaction.options.getInteger("song") - 1;

    const removedSong = queue.splice(removeIndex, 1)[0];

    interaction.reply({
        embeds: [CreateEmbed(`Successfully removed **${removedSong.title}**!`, { color: EmbedColor.Success })]
    });

    // decrement playindex when needed
    if(playindex >= removeIndex) { 
        playindex--;

        // if we've removed the currently playing song, start playing
        if(removeIndex === (playindex + 1)) 
            startPlaying(interaction);
    }

}

function pause(interaction: ChatInputCommandInteraction) {
	if (!playing) return "No songs are playing right now";

	player.pause();

	const embed = CreateEmbed(`Successfully paused **${queue[playindex].title}**!`, { color: EmbedColor.Success });
	interaction.reply({ embeds: [embed] });
}

function continueMusic(interaction: ChatInputCommandInteraction) {
	if (!playing) return "No songs are playing right now";

	player.unpause();

	const embed = CreateEmbed(`Successfully continued **${queue[playindex].title}**!`, { color: EmbedColor.Success });
	interaction.reply({ embeds: [embed] });
}

/**
 * A function to join a voice channel, wait until we're ready to play music, then return the connnection
 */
function join(interaction: ChatInputCommandInteraction) {
	const connection = joinVoiceChannel({
		channelId: (interaction.member as GuildMember).voice.channelId,
		guildId: interaction.guild.id,
		adapterCreator: interaction.guild.voiceAdapterCreator
	});

	return entersState(connection, VoiceConnectionStatus.Ready, 5_000);
}

/**
 * This function plays a song from the queue
 * It expects the queue to have songs
 */
async function startPlaying(interaction: ChatInputCommandInteraction) {
	playindex++;

	if (playindex >= queue.length) {
		// the index has overflown, so we either have to kill the player or reset playindex
		if (looptype !== 2) {
			kill(interaction);
			return;
		}

		playindex = 0;
	}

	const song = queue[playindex];

	playing = song;

	// initialize song resource
	const resource = await song.init()
		.then((songData) => { return songData.resource });

	const embed = CreateEmbed(`**${song.title}** has started playing!`);
	interaction.channel.send({ embeds: [embed] });

	// start playing the song
	player.play(resource);

	// set up a listener when we end the song
    //@ts-expect-error
	player.once(AudioPlayerStatus.Idle, () => {
		// check if we have songs left
		if (queue.length > 0) {
			// first we need to see if we've went over the queue
			if (playindex >= queue.length - 1 && looptype !== 2) {
				kill(interaction);
				return;
			}

			// since startPlaying will increase playindex, we want to keep it the same when we're looping only one
			if (looptype === 1) playindex--;

			startPlaying(interaction);
		} else {
			kill(interaction);
		}
	})
}

/**
 * A function for completely stopping the music player
 */
function kill(interaction: ChatInputCommandInteraction) {
	// stop the player
	player?.stop(true);
	player = null;

	// destroy the connection
	getVoiceConnection(interaction.guild.id).destroy();

	playindex = 0;
	queue = [];
	playing = false;
}

/**
 * A function to parse and add songs based on the link
 * Works with every type of song supported by play-dl
 * !!! It expects a valid url !!!
 * @returns An embed with some metadata of the bot / false in case the song type is not supported
 */
async function addSong(interaction: ChatInputCommandInteraction, link: string) {
	await interaction.deferReply();

	// check what type of song we have
	const songType = await pldl.validate(link);

	if (songType === "yt_video") {
		// get the metadata from the video
		const videoInfo = await pldl.video_basic_info(link).then((info) => { return info.video_details });

		const song = new Song(link, songType, videoInfo.title);
		queue.push(song);

		return CreateEmbed(`**${song.title}** has been added to the queue!`, {
			color: EmbedColor.Success
		})
			.setThumbnail(videoInfo.thumbnails[videoInfo.thumbnails.length - 1].url)
			.addFields([
				{
					name: "Uploaded by",
					value: videoInfo.channel.name,
					inline: true
				},
				{
					name: "Likes",
					value: videoInfo.likes.toString(),
					inline: true
				}
			]);
	}

	if (songType === "yt_playlist") {
		// we're going to add all the videos in the playlist (that sounds kinda bad and it is, but who cares)
		const playlist = await pldl.playlist_info(link, { incomplete: true });

		const doShuffle = interaction.options.getBoolean("shuffle") ?? false;

		const videos = doShuffle ? shuffle(await playlist.all_videos()) : await playlist.all_videos();

		for (const video of videos) {
			const song = new Song(video.url, "yt_video", video.title);
			queue.push(song);
		}

		return CreateEmbed(`Successfully added **${videos.length}** videos to the queue!`, {
			color: EmbedColor.Success
		})
			.setThumbnail(playlist.thumbnail.url)
			.addFields([
				{
					name: "Uploaded by",
					value: playlist.channel.name,
					inline: true
				}
			]);
	}

	// return false if song type is not supported
	return false;
}

type SongType = 'so_playlist' | 'so_track' | 'sp_track' | 'sp_album' | 'sp_playlist' | 'dz_track' | 'dz_playlist' | 'dz_album' | 'yt_video' | 'yt_playlist' | 'search';

class Song {
    /**
     * The full URL to the song
     * @type {string}
     */
    link: string;
    /**
     * Type from play-dl
     */
    type: SongType;
    /**
     * The resource that we can send to Discord
     */
    resource: AudioResource;
    /**
     * The title of this song
     */
    title: string;

    constructor(link: string, type: SongType, title: string) {
        this.link = link;
        this.type = type;
        this.title = title;
    }

    async init() {
        try {
            const video = await pldl.stream(this.link, { quality: 0 });

            // save it to our resource
            this.resource = createAudioResource(video.stream, {
                inputType: video.type
            });

            return this;
        } catch (e) {
            // the link is probably incorrectly formatted
            throw new Error("The link is malformed");
        }
    }
}

/**
 * A utility function for shuffling an array (https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
 * @param array The array to shuffle
 * @returns The shuffled array
 */
function shuffle(array: Array<any>) {
	let currentIndex = array.length,
		randomIndex: number;

	// While there remain elements to shuffle.
	while (currentIndex != 0) {
		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		];
	}

	return array;
}

export default MusicCommmand;