import { ActionRowBuilder, APIActionRowComponent, Client, EmbedBuilder, SelectMenuBuilder } from "discord.js";
import LevelConfig from "../database/LevelConfig";
import SlashCommand from "../types/SlashCommand";
import { GetGuild } from "../util/ClientUtils";
import CreateEmbed from "../util/CreateEmbed";
import { LevelToXP, XPToLevelUp } from "../util/LevelUtil";
import Log, { LogType } from "../util/Log";
import { CalculateMaxPage } from "../util/MathUtils";

const PageSize = 10;
/**
 * A map to hold all the pages as a cache.
 */
const Cache = new Map<number, Array<PageCache>>();

const LeaderboardCommand: SlashCommand = {
    name: "leaderboard",

    async run(interaction, client) {
        // defer the interaction, since caching might take some time
        await interaction.deferReply({ ephemeral: true });

        // get all levels
        const levels = await LevelConfig.find().sort({ xp: -1 });

        // get the page
        const page = interaction.options.getInteger("page") ?? 1;

        // get max page
        const maxPage = await GetMaxPage();

        if (levels.length === 0) return "Don't know how, but there are no people with a rank.";

        // check if page is valid
        if (page != 1 && page > maxPage) return "That page is not available.";

        // check if the page is cached
        if (!PageInCache(page)) await CachePage(levels, page, client);

        // we should now have the page in cache
        const embed = await ReadFromPage(page, maxPage);
        if (typeof embed === "string") return embed;

        // show embed
        interaction.editReply({
            embeds: [embed],
            components: [GetPageSelector(maxPage)],
        });
    },

    async runSelectMenu(interaction, client) {
        // get page
        const page = Number.parseInt(interaction.values[0]);

        // get max page
        const maxPage = await GetMaxPage();

        // check if page is valid
        if (page != 1 && page > maxPage)
            return "For some super bizarre reason, that page is not available.";

        // get levels
        const levels = await LevelConfig.find().sort({ xp: -1 });

        // check if the page is cached
        if (!PageInCache(page)) await CachePage(levels, page, client);

        // now let's read it
        const embed = await ReadFromPage(page, maxPage);
        if (typeof embed === "string") return embed;

        // edit the interaction
        interaction.update({ embeds: [embed] });
    }
};

interface PageCache {
    /**
     * The name of the user.
     */
    name: string,
    /**
     * The level config of the user.
     */
    level: any,
};

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
function GetPageFromCache(page: number, force: boolean = false, values: Array<PageCache> = null) {
    if (force) return Cache.set(page, values);

    return PageInCache(page) ? Cache.get(page) : null;
}

/**
 * A function for reading a page from the cache.
 * @param page The page to read from.
 * @param maxPage The max page available.
 */
async function ReadFromPage(page: number, maxPage: number): Promise<EmbedBuilder | string> {
    if (!PageInCache(page)) return "That page is not cached, which should NOT happen";

    // get page from cache
    const cachepage = GetPageFromCache(page) as Array<PageCache>;

    const embed = CreateEmbed(
        `**Rank leaderboard of ${GetGuild().name}**`,
        {
            title: `Rank leaderboard (page ${page} / ${maxPage})`,
        }
    ).setFooter({
        text: "The leaderboard is cached, it refreshes every 15 minutes.",
    });

    // read from the page
    for (let i = 0; i < PageSize; i++) {
        if (!cachepage[i]) break; // we have reached the end of the page

        const rank = cachepage[i];
        const level = rank.level;

        // get the relative xp from the level config
        const relativexp = level.xp - LevelToXP(level.level);

        // using some math to figure out the percentage of the relative xp
        let levelpercentage = Number.parseInt(
            ((relativexp * 100) / XPToLevelUp(level.level)).toFixed(0)
        );

        // now we do some serious shit to turn it into a nice string
        levelpercentage -= levelpercentage % 10;
        levelpercentage /= 10;
        if (isNaN(levelpercentage)) levelpercentage = 0;

        // preview: [####x.....]
        const levelpercentagestring = `[${"#".repeat(
            levelpercentage
        )}x${".".repeat(9 - levelpercentage)}]`;

        embed.addFields([
            {
                // this part figures out the position of the rank in the leaderboard
                name: `${((page - 1) * PageSize + i + 1).toString()}. ${rank.name}`,
                value: `Level: ${level.level} | Total XP: ${level.xp}\nNext level: ${levelpercentagestring}`,
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
async function GetMaxPage(): Promise<number> {
    const levelcount = await LevelConfig.countDocuments();

    return CalculateMaxPage(levelcount, PageSize);
}

/**
 * A function for generating a pageselector.
 * @param maxPage The max page available.
 * @returns The pageselector component.
 */
function GetPageSelector(maxPage: number) {
    let options = new Array();

    for (let i = 1; i <= maxPage; i++) {
        options.push({
            label: `Page ${i}`,
            value: i.toString(),
            description: `Show page ${i}`,
        });
    }

    return new ActionRowBuilder().addComponents([
        new SelectMenuBuilder()
            .setCustomId("leaderboard.pageselector")
            .setMaxValues(1)
            .setOptions(options),
    ]).toJSON() as APIActionRowComponent<any>;
}

/**
 * A function for caching a page.
 * @param levels The level configs to cache.
 * @param page The page to cache.
 * @param client The bot client.
 */
async function CachePage(levels: Array<any>, page: number, client: Client) {
    // create a buffer to later write into cache
    const buffer = new Array<PageCache>(PageSize);

    // create the start index for levels
    const start_index = (page - 1) * PageSize;

    // now read PAGE_SIZE levels
    for (
        let j = start_index;
        j < start_index + PageSize && j < levels.length;
        j++
    ) {
        // read level
        const level = levels[j];

        // try to get name
        const user = await client.users
            .fetch(level.id)
            .catch(() => Log(`Couldn't fetch user, perhaps they left?`, LogType.Warn));

        // get the name (user might be null, then we should use Unknown)
        const name = user ? user.tag : "Unknown";

        // write to buffer
        buffer[j - start_index] = {
            name, level
        };
    }

    // write buffer to cache
    Cache.set(page, buffer);
}

// let's set up a one hour timer to reset the cache
setInterval(() => {
    if (Cache.size === 0) return;
    Cache.clear();
}, 1000 * 60 * 15); // 15 minutes

export default LeaderboardCommand;