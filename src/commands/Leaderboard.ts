import { DBLevel } from "@mester-ulquiorra/commonlib";
import { ActionRowBuilder, APISelectMenuOption, Client, GuildMember, StringSelectMenuBuilder } from "discord.js";
import LevelConfig from "../database/LevelConfig.js";
import langs from "../lang/commands/leaderboard.js";
import SlashCommand from "../types/SlashCommand.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { LevelToXP, XPToLevel, XPToLevelUp } from "../util/LevelUtils.js";
import Localisatior, { GetMemberLanguage, LocLanguage } from "../util/Localisatior.js";
import { CalculateMaxPage } from "../util/MathUtils.js";

const loc = new Localisatior(langs);

const PageSize = 10;
/**
 * A map to hold all the pages as a cache.
 */
const Cache = new Map<number, Array<PageCache>>();

const LeaderboardCommand: SlashCommand = {
	name: "leaderboard",

	async run(interaction, client) {
		const userLang = await GetMemberLanguage(interaction.member as GuildMember);

		// defer the interaction, since caching might take some time
		await interaction.deferReply({ ephemeral: true });

		// get all levels
		const levels = await LevelConfig.find().sort({ xp: -1 });

		// get the page
		const page = interaction.options.getInteger("page") ?? 1;

		// get max page
		const maxPage = await GetMaxPage();

		if (levels.length === 0) return loc.get(userLang, "error.noLevels");

		// check if page is valid
		if (page != 1 && page > maxPage) return loc.get(userLang, "error.invalidPage");

		// check if the page is cached
		if (!PageInCache(page)) await CachePage(levels, page, client);

		// we should now have the page in cache
		const embed = await ReadFromPage(page, maxPage, userLang);
		if (typeof embed === "string") return embed;

		// show embed
		interaction.editReply({
			embeds: [embed],
			components: [GetPageSelector(maxPage, userLang)],
		});
	},

	async runStringSelectMenu(interaction, client) {
		const userLang = await GetMemberLanguage(interaction.member as GuildMember);

		// get page
		const page = Number.parseInt(interaction.values[0]);

		// get max page
		const maxPage = await GetMaxPage();

		// check if page is valid
		if (page != 1 && page > maxPage) return loc.get(userLang, "error.invalidPage");

		// get levels
		const levels = await LevelConfig.find().sort({ xp: -1 });

		// check if the page is cached
		if (!PageInCache(page)) await CachePage(levels, page, client);

		// now let's read it
		const embed = await ReadFromPage(page, maxPage, userLang);
		if (typeof embed === "string") return embed;

		// edit the interaction
		interaction.update({ embeds: [embed] });
	},
};

interface PageCache {
	/**
	 * The name of the user.
	 */
	name: string;
	/**
	 * The level config of the user.
	 */
	level: DBLevel;
}

/**
 * A function for checking if a page is in cache.
 * @param page The page to check.
 */
function PageInCache(page: number) {
	return Cache.has(page);
}

/**
 * A function for getting a page from the cache.
 * @param page The page to get.
 * @param force If set to true, it will CREATE that page.
 * @param values Only works if force is true, basically the values to add to cache.
 */
function GetPageFromCache(page: number, force = false, values: Array<PageCache> = null) {
	if (force) return Cache.set(page, values);

	return PageInCache(page) ? Cache.get(page) : null;
}

/**
 * A function for reading a page from the cache.
 * @param page The page to read from.
 * @param maxPage The max page available.
 */
async function ReadFromPage(page: number, maxPage: number, lang: LocLanguage) {
	if (!PageInCache(page)) return loc.get(lang, "error.uncachedPage");

	// get page from cache
	const cachedPage = GetPageFromCache(page) as Array<PageCache>;

	const embed = CreateEmbed(loc.get(lang, "embed.desc", GetGuild().name), {
		title: loc.get(lang, "embed.title", page.toString(), maxPage.toString()),
	}).setFooter({
		text: loc.get(lang, "embed.footer"),
	});

	// read from the page
	for (let i = 0; i < PageSize; i++) {
		if (!cachedPage[i]) break; // we have reached the end of the page

		const rank = cachedPage[i];
		const levelInfo = rank.level;

		const level = XPToLevel(levelInfo.xp);

		// get the relative xp from the level config
		const relativexp = levelInfo.xp - LevelToXP(level);

		// using some math to figure out the percentage of the relative xp
		let levelpercentage = Number.parseInt(((relativexp * 100) / XPToLevelUp(level)).toFixed(0));

		// now we do some serious shit to turn it into a nice string
		levelpercentage -= levelpercentage % 10;
		levelpercentage /= 10;
		if (isNaN(levelpercentage)) levelpercentage = 0;

		// preview: [####x.....]
		const levelPercentageString = `[${"#".repeat(levelpercentage)}x${".".repeat(9 - levelpercentage)}]`;

		embed.addFields([
			{
				// this part figures out the position of the rank in the leaderboard
				name: `${((page - 1) * PageSize + i + 1).toString()}. ${rank.name}`,
				value: loc.get(lang, "embed.rank_value", level.toString(), levelInfo.xp.toString(), levelPercentageString),
				inline: false,
			},
		]);
	}

	// return the embed
	return embed;
}

/**
 * A function to get the max level page.
 * @returns The highest page number.
 */
async function GetMaxPage() {
	const levelcount = await LevelConfig.countDocuments();

	return CalculateMaxPage(levelcount, PageSize);
}

/**
 * A function for generating a pageselector.
 * @param maxPage The max page available.
 * @returns The pageselector component.
 */
function GetPageSelector(maxPage: number, lang: LocLanguage) {
	const options = new Array<APISelectMenuOption>();

	for (let i = 1; i <= maxPage; i++) {
		options.push({
			label: loc.get(lang, "selector.label", i.toString()),
			value: i.toString(),
			description: loc.get(lang, "selector.description", i.toString()),
		});
	}

	return new ActionRowBuilder<StringSelectMenuBuilder>()
		.addComponents([new StringSelectMenuBuilder().setCustomId("leaderboard.pageselector").setMaxValues(1).setOptions(options)])
		.toJSON();
}

/**
 * A function for caching a page.
 * @param levels The level configs to cache.
 * @param page The page to cache.
 * @param client The bot client.
 */
async function CachePage(levels: Array<DBLevel>, page: number, client: Client) {
	// create a buffer to later write into cache
	const buffer = new Array<PageCache>(PageSize);

	// create the start index for levels
	const start_index = (page - 1) * PageSize;

	// now read PAGE_SIZE levels
	for (let j = start_index; j < start_index + PageSize && j < levels.length; j++) {
		// read level
		const level = levels[j];

		// try to get name
		const user = await client.users
			.fetch(level.userId)
			.then((user) => {
				return user;
			})
			.catch(() => {
				return null;
			});

		// get the name (user might be null, then we should use Unknown)
		const name = user ? user.tag : "#Unknown#";

		// write to buffer
		buffer[j - start_index] = {
			name,
			level,
		};
	}

	// write buffer to cache
	Cache.set(page, buffer);
}

// let's set up a one hour timer to reset the cache
setInterval(
	() => {
		if (Cache.size === 0) return;
		Cache.clear();
	},
	1000 * 60 * 15
); // 15 minutes

export default LeaderboardCommand;
