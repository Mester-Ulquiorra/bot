import {
	ActionRowBuilder,
	ApplicationCommandOptionChoiceData,
	ChatInputCommandInteraction,
	ComponentType,
	StringSelectMenuBuilder,
	hyperlink,
	time
} from "discord.js";
import SteamAPI from "steamapi";
import config from "../../config.js";
import testMode from "../../testMode.js";
import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { CalculateMaxPage } from "../../util/MathUtils.js";
import { formatDurationFromMinutes } from "../../util/MiscUtils.js";

const regionf = new Intl.DisplayNames("en-UK", { type: "region" });

const steam = new SteamAPI(config.DANGER.STEAM_API_KEY);
const cachedApps = steam.getAppList().then((apps) => apps.filter((app) => app.name !== "").sort((a, b) => a.appid - b.appid));

const SteamStatsCommand: SlashCommand = {
	name: "_",

	async run(interaction, client) {
		if (interaction.options.getSubcommand() === "app") {
			return getSteamApp(interaction);
		}

		if (interaction.options.getSubcommand() === "user") {
			return getUserProfile(interaction);
		}

		if (interaction.options.getSubcommand() === "achievements") {
			return getUserAchievements(interaction);
		}
	},

	async runAutocomplete(interaction, client) {
		const apps = (await cachedApps)
			.filter((app) => app.name.toLowerCase().includes(interaction.options.getString("app", true).toLowerCase()))
			.slice(0, 25);

		interaction.respond(
			apps.map((app) => {
				return {
					name: app.name.slice(0, 100),
					value: app.appid.toString(),
				} as ApplicationCommandOptionChoiceData<string>;
			})
		);
	},
};

async function getUserAchievements(interaction: ChatInputCommandInteraction) {
	const userId = await getUserID(interaction.options.getString("user", true));
	const appId = interaction.options.getString("app", true);

	if (userId instanceof Error) {
		return userId.message;
	}

	const user = await steam.getUserSummary(userId);
	const achievements = await steam.getUserAchievements(userId, appId);

	const maxPage = CalculateMaxPage(achievements.achievements.length, 10);
	const pages = new Array<{ name: string; value: string; inline: boolean }[]>();

	for (let i = 0; i < maxPage; i++) {
		pages.push(
			achievements.achievements.slice(i * 10, (i + 1) * 10).map((a) => {
				return {
					name: a.name,
					value: a.achieved ? `✅ (${time(a.unlockTime)})` : "❌",
					inline: false,
				};
			})
		);
	}

	// completed / total
	const totalText = `\nCompleted achievements: ${achievements.achievements.filter((a) => a.achieved).length} / ${
		achievements.achievements.length
	}`;
	const embed = CreateEmbed(
		`**Achievements of ${user.nickname} for ${achievements.gameName}** ${hyperlink("Steam Profile", user.url)}` + totalText
	);

	embed.setThumbnail(user.avatar.large);
	embed.setFields(pages[0]);
	embed.setFooter({ text: `Page 1/${maxPage}` });

	// set up a component that allows the user to change the page
	const components = [
		new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
			new StringSelectMenuBuilder()
				.setCustomId("steam.achievements.page")
				.setPlaceholder("Select Page")
				.setOptions(
					pages.map((_, i) => {
						return {
							label: `Page ${(i + 1).toString()}`,
							value: i.toString(),
						};
					})
				)
		),
	];

	interaction.reply({ embeds: [embed], components }).then((res) => {
		// set up a listener for the component
		res.createMessageComponentCollector({
			filter: (i) => i.customId === "steam.achievements.page",
			componentType: ComponentType.StringSelect,
		}).on("collect", async (i) => {
			if (i.user.id !== interaction.user.id) {
				i.reply({
					content: "You can't change the page, this command was not sent by you!",
					ephemeral: true,
				});
				return;
			}

			const page = parseInt(i.values[0]);

			embed.setFields(pages[page]);
			embed.setFooter({ text: `Page ${page + 1}/${maxPage}` });

			i.update({ embeds: [embed], components });
		});
	});
}

async function getUserProfile(interaction: ChatInputCommandInteraction) {
	const userId = await getUserID(interaction.options.getString("user", true));

	if (userId instanceof Error) {
		return userId.message;
	}

	const user = await steam.getUserSummary(userId);
	const userGames = await steam
		.getUserOwnedGames(userId)
		.then((games) => {
			return games;
		})
		.catch(() => {
			return new Array<SteamAPI.Game>();
		});

	const realName = user.realName ? ` (${user.realName})` : undefined;
	const embed = CreateEmbed(`**Information about ${user.nickname}${realName ?? ""}** ${hyperlink("Steam Profile", user.url)}`);

	embed.setThumbnail(user.avatar.large);

	// add created at
	embed.addFields({
		name: "Created At",
		value: user.created ? time(user.created) : "Not public",
		inline: true,
	});
	// add last log off
	embed.addFields({
		name: "Last Log Off",
		value: user.lastLogOff ? time(user.lastLogOff) : "Not public",
		inline: true,
	});
	// add country
	embed.addFields({
		name: "Country",
		value: user.countryCode ? `${regionf.of(user.countryCode)}` : "Not public",
		inline: true,
	});

	// add total playtime
	embed.addFields({
		name: "Total Playtime",
		value: formatDurationFromMinutes(userGames.reduce((prev, curr) => prev + curr.playTime, 0)) || "none",
		inline: true,
	});
	// add total games
	embed.addFields({
		name: "Total Games",
		value: userGames.length.toString(),
		inline: true,
	});

	// get 5 most played games
	const mostPlayed = userGames.sort((a, b) => b.playTime - a.playTime).slice(0, 5);
	const mostPlayedString = mostPlayed
		.map((game) => {
			return (
				hyperlink(`${game.name}`, `https://store.steampowered.com/app/${game.appID}`) +
				` - ${formatDurationFromMinutes(game.playTime)}`
			);
		})
		.join("\n");

	embed.addFields({
		name: "Most Played Games",
		value: mostPlayedString || "none",
	});

	embed.setFooter({ text: `Steam ID: ${user.steamID}` });

	interaction.reply({ embeds: [embed] });
}

async function getSteamApp(interaction: ChatInputCommandInteraction) {
	const appId = interaction.options.getString("app", true);
	const details = await steam.getGameDetails(appId);

	if (testMode) console.log(details);

	const app = (await cachedApps).find((a) => a.appid === Number.parseInt(appId));
	if (!app) return "Steam app was not found in local cache, was it recently added?";

	const embed = CreateEmbed(
		`**Information about ${app.name}** ${hyperlink("Steam Store", `https://store.steampowered.com/app/${appId}`)}`
	);
	embed.addFields({
		name: "Description",
		value: details.short_description as string,
	});
	if (Array.isArray(details.developers))
		embed.addFields({
			name: "Developers",
			value: details.developers.join(", "),
		});
	if (Array.isArray(details.publishers))
		embed.addFields({
			name: "Publishers",
			value: details.publishers.join(", "),
		});

	if (isPrice(details.price_overview)) {
		embed.addFields({
			name: "Price",
			value: `${details.price_overview.final_formatted}`,
			inline: true,
		});
	} else {
		embed.addFields({
			name: "Price",
			value: "Free",
			inline: true,
		});
	}

	embed.addFields({
		name: "Online Players",
		value: (await steam.getGamePlayers(appId)).toString(),
		inline: true,
	});

	if (isTrailers(details.movies)) {
		const trailersFinal = new Array<string>();
		for (let i = 0; i < details.movies.length; i++) {
			trailersFinal.push(hyperlink(`Trailer ${i + 1}`, details.movies[i].mp4.max));
		}
		embed.addFields({ name: "Trailers", value: trailersFinal.join(" ") });
	}

	const DLCs = details["dlc"];
	if (isDLC(DLCs)) {
		const dlcFinal = new Array<string>();
		for (let i = 0; i < DLCs.length; i++) {
			const dlc = (await cachedApps).find((a) => a.appid === DLCs[i]);
			if (dlc) dlcFinal.push(hyperlink(dlc.name + (i + 1).toString(), `https://store.steampowered.com/app/${DLCs[i]}`));
		}
		embed.addFields({ name: "DLCs", value: dlcFinal.join(" ") });
	}

	if (isReleaseDate(details.release_date)) {
		embed.addFields({
			name: "Release Date",
			value: details.release_date.coming_soon ? "Coming Soon" : details.release_date.date,
			inline: true,
		});
	}

	if (isAchievements(details.achievements)) {
		embed.addFields({
			name: "Achievements",
			value: details.achievements.total.toString(),
			inline: true,
		});
	}

	if (isContentDescriptors(details.content_descriptors)) {
		embed.addFields({
			name: "Content Descriptors",
			value: details.content_descriptors.notes,
		});
	}

	if (typeof details.header_image === "string") embed.setImage(details.header_image);

	interaction.reply({ embeds: [embed] });
}

/**
 * A function for converting raw data into a steam user id
 * @param data The raw data that should be converted to a steam user id
 * @returns A promise that resolves to the steam user id or an Error if the user couldn't be found
 */
async function getUserID(data: string) {
	// if user doesn't start with https, assume it's a user name and append it to the url
	let userURL = data;
	if (/^\d+/.test(userURL)) userURL = `https://steamcommunity.com/profiles/${userURL}`;
	else if (!userURL.startsWith("https")) userURL = `https://steamcommunity.com/id/${userURL}`;

	try {
		const id = await steam.resolve(userURL);
		return id;
	} catch {
		return new Error("Couldn't find user.");
	}
}

function isDLC(obj: unknown): obj is number[] {
	if (!Array.isArray(obj)) {
		return false;
	}

	return obj.every((item) => typeof item === "number");
}

interface Price {
	final_formatted: string;
}

// Helper functions for Steam details
function isPrice(obj: unknown): obj is { final_formatted: string } {
	return typeof obj === "object" && obj !== null && typeof (obj as Price)["final_formatted"] === "string";
}

function isTrailers(obj: unknown): obj is { mp4: { max: string } }[] {
	return (
		typeof obj === "object" &&
		obj !== null &&
		obj instanceof Array &&
		obj.every(
			(o) =>
				typeof o === "object" &&
				o !== null &&
				typeof o["mp4"] === "object" &&
				o["mp4"] !== null &&
				typeof o["mp4"]["max"] === "string"
		)
	);
}

interface ReleaseDate {
	coming_soon: boolean;
	date: string;
}

function isReleaseDate(obj: unknown): obj is ReleaseDate {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as ReleaseDate)["coming_soon"] === "boolean" &&
		typeof (obj as ReleaseDate)["date"] === "string"
	);
}

interface Achievements {
	total: number;
}

function isAchievements(obj: unknown): obj is { total: number } {
	return typeof obj === "object" && obj !== null && typeof (obj as Achievements)["total"] === "number";
}

interface ContentDescriptors {
	notes: string;
}

function isContentDescriptors(obj: unknown): obj is { notes: string } {
	return typeof obj === "object" && obj !== null && typeof (obj as ContentDescriptors)["notes"] === "string";
}

export default SteamStatsCommand;
