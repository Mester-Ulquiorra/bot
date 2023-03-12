import { ActionRowBuilder, ChatInputCommandInteraction, Client, ComponentType, StringSelectMenuBuilder, hyperlink, time } from "discord.js";
import SteamAPI from "steamapi";
import config from "../../config.js";
import SlashCommand from "../../types/SlashCommand.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { CalculateMaxPage } from "../../util/MathUtils.js";
import { formatDurationFromMinutes } from "../../util/MiscUtils.js";
import testMode from "../../testMode.js";

const regionf = new Intl.DisplayNames("en-UK", { type: "region" });

const steam = new SteamAPI(config.DANGER.STEAM_API_KEY);
const cachedApps = (await steam.getAppList())
    .filter(app => app.name !== "")
    .sort((a, b) => a.appid - b.appid);

const SteamStatsCommand: SlashCommand = {
    name: "_",

    async run(interaction, client) {
        if (interaction.options.getSubcommand() === "app") {
            return getSteamApp(interaction, client);
        }

        if (interaction.options.getSubcommand() === "user") {
            return getUserProfile(interaction, client);
        }

        if (interaction.options.getSubcommand() === "achievements") {
            return getUserAchievements(interaction, client);
        }
    },

    async runAutocomplete(interaction, client) {
        const apps = cachedApps.filter(app => app.name.toLowerCase().includes(interaction.options.getString("app").toLowerCase())).slice(0, 25);
        interaction.respond(apps.map(app => { return { name: app.name.slice(0, 100), value: app.appid.toString() }; }));
    }
};

async function getUserAchievements(interaction: ChatInputCommandInteraction, client: Client) {
    const userId = await getUserID(interaction.options.getString("user"));
    const appId = interaction.options.getString("app");

    if (userId instanceof Error) {
        return userId.message;
    }

    const user = await steam.getUserSummary(userId);
    const achievements = await steam.getUserAchievements(userId, appId);

    const maxPage = CalculateMaxPage(achievements.achievements.length, 10);
    const pages = new Array<{ name: string, value: string, inline: boolean }[]>();

    for (let i = 0; i < maxPage; i++) {
        pages.push(achievements.achievements.slice(i * 10, (i + 1) * 10).map(a => {
            return { name: a.name, value: a.achieved ? `✅ (${time(a.unlockTime)})` : "❌", inline: false };
        }));
    }

    // completed / total
    const totalText = `\nCompleted achievements: ${achievements.achievements.filter(a => a.achieved).length} / ${achievements.achievements.length}`;
    const embed = CreateEmbed(`**Achievements of ${user.nickname} for ${achievements.gameName}** ${hyperlink("Steam Profile", user.url)}` + totalText);

    embed.setThumbnail(user.avatar.large);
    embed.setFields(pages[0]);
    embed.setFooter({ text: `Page 1/${maxPage}` });

    // set up a component that allows the user to change the page
    const components = [
        new ActionRowBuilder<StringSelectMenuBuilder>()
            .setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("steam.achievements.page")
                    .setPlaceholder("Select Page")
                    .setOptions(pages.map((_, i) => { return { label: `Page ${(i + 1).toString()}`, value: i.toString() }; }))
            )
    ];

    interaction.reply({ embeds: [embed], components })
        .then((res) => {
            // set up a listener for the component
            res.createMessageComponentCollector({
                filter: (i) => i.customId === "steam.achievements.page",
                componentType: ComponentType.StringSelect,
            })
                .on("collect", async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        i.reply({ content: "You can't change the page, this command was not sent by you!", ephemeral: true });
                        return;
                    }

                    const page = parseInt(i.values[0]);

                    embed.setFields(pages[page]);
                    embed.setFooter({ text: `Page ${page + 1}/${maxPage}` });

                    i.update({ embeds: [embed], components });
                });
        });
}

async function getUserProfile(interaction: ChatInputCommandInteraction, client: Client) {
    const userId = await getUserID(interaction.options.getString("user"));

    if (userId instanceof Error) {
        return userId.message;
    }

    const user = await steam.getUserSummary(userId);
    const userGames = await steam.getUserOwnedGames(userId)
        .then((games) => { return games; })
        .catch(() => { return new Array<SteamAPI.Game>(); });

    const realName = user.realName ? ` (${user.realName})` : undefined;
    const embed = CreateEmbed(`**Information about ${user.nickname}${realName ?? ""}** ${hyperlink("Steam Profile", user.url)}`);

    embed.setThumbnail(user.avatar.large);

    // add created at
    embed.addFields({ name: "Created At", value: user.created ? time(user.created) : "Not public", inline: true });
    // add last log off
    embed.addFields({ name: "Last Log Off", value: user.lastLogOff ? time(user.lastLogOff) : "Not public", inline: true });
    // add country
    embed.addFields({ name: "Country", value: user.countryCode ? `${regionf.of(user.countryCode)}` : "Not public", inline: true });

    // add total playtime
    embed.addFields({ name: "Total Playtime", value: formatDurationFromMinutes(userGames.reduce((prev, curr) => (prev + curr.playTime), 0)) || "none", inline: true });
    // add total games
    embed.addFields({ name: "Total Games", value: userGames.length.toString(), inline: true });

    // get 5 most played games
    const mostPlayed = userGames.sort((a, b) => b.playTime - a.playTime).slice(0, 5);
    const mostPlayedString = mostPlayed.map(game => {
        return hyperlink(`${game.name}`, `https://store.steampowered.com/app/${game.appID}`) + ` - ${formatDurationFromMinutes(game.playTime)}`;
    }).join("\n");

    embed.addFields({ name: "Most Played Games", value: mostPlayedString || "none" });

    embed.setFooter({ text: `Steam ID: ${user.steamID}` });

    interaction.reply({ embeds: [embed] });
}

async function getSteamApp(interaction: ChatInputCommandInteraction, client: Client) {
    const appId = interaction.options.getString("app");
    const details = await steam.getGameDetails(appId);

    if (testMode) console.log(details);

    const embed = CreateEmbed(`**Information about ${cachedApps.find(a => a.appid === Number.parseInt(appId)).name}** ${hyperlink("Steam Store", `https://store.steampowered.com/app/${appId}`)}`);
    embed.addFields(
        {
            name: "Description",
            value: details.short_description as string,
        }
    );
    if (details.developers instanceof Array<string>) embed.addFields({ name: "Developers", value: details.developers.join(", ") });
    if (details.publishers instanceof Array<string>) embed.addFields({ name: "Publishers", value: details.publishers.join(", ") });

    if (isPrice(details.price_overview)) {
        embed.addFields({
            name: "Price",
            value: `${details.price_overview.final_formatted}`,
            inline: true
        });
    } else {
        embed.addFields({
            name: "Price",
            value: "Free",
            inline: true
        });
    }

    embed.addFields({ name: "Online Players", value: (await steam.getGamePlayers(appId)).toString(), inline: true });

    if (isTrailers(details.movies)) {
        const trailersFinal = new Array<string>();
        for (let i = 0; i < details.movies.length; i++) {
            trailersFinal.push(hyperlink(`Trailer ${i + 1}`, details.movies[i].mp4.max));
        }
        embed.addFields({ name: "Trailers", value: trailersFinal.join(" ") });
    }

    if (details.dlc instanceof Array<number>) {
        const dlcFinal = new Array<string>();
        for (let i = 0; i < details.dlc.length; i++) {
            const dlc = cachedApps.find(a => a.appid === details.dlc[i]);
            if (dlc) dlcFinal.push(hyperlink(dlc.name + (i + 1).toString(), `https://store.steampowered.com/app/${details.dlc[i]}`));
        }
        embed.addFields({ name: "DLCs", value: dlcFinal.join(" ") });
    }

    if (isReleaseDate(details.release_date)) {
        embed.addFields({ name: "Release Date", value: details.release_date.coming_soon ? "Coming Soon" : details.release_date.date, inline: true });
    }

    if (isAchievements(details.achievements)) {
        embed.addFields({ name: "Achievements", value: details.achievements.total.toString(), inline: true });
    }

    if (isContentDescriptors(details.content_descriptors)) {
        embed.addFields({ name: "Content Descriptors", value: details.content_descriptors.notes });
    }

    if (typeof details.header_image === "string") embed.setImage(details.header_image);

    interaction.reply({ embeds: [embed] });
}

/**
 * A function for converting raw data into a steam user id
 * @param data The raw data that should be converted to a steam user id
 * @returns A promise that resolves to the steam user id or an Error if the user couldn't be found
 */
function getUserID(data: string) {
    // if user doesn't start with https, assume it's a user name and append it to the url
    let userURL = data;
    if (/^\d+/.test(userURL)) userURL = `https://steamcommunity.com/profiles/${userURL}`;
    else if (!userURL.startsWith("https")) userURL = `https://steamcommunity.com/id/${userURL}`;

    return steam.resolve(userURL)
        .then((id) => {
            return id;
        })
        .catch(() => {
            return new Error("Couldn't find user.");
        });
}

// Helper functions for Steam details
function isPrice(obj: unknown): obj is { final_formatted: string } {
    return typeof obj === "object"
        && obj !== null
        && typeof obj["final_formatted"] === "string";
}

function isTrailers(obj: unknown): obj is { mp4: { max: string } }[] {
    return typeof obj === "object"
        && obj !== null
        && obj instanceof Array
        && obj.every(o => typeof o === "object"
            && o !== null
            && typeof o["mp4"] === "object"
            && o["mp4"] !== null
            && typeof o["mp4"]["max"] === "string");
}

function isReleaseDate(obj: unknown): obj is { coming_soon: boolean, date: string } {
    return typeof obj === "object"
        && obj !== null
        && typeof obj["coming_soon"] === "boolean"
        && typeof obj["date"] === "string";
}

function isAchievements(obj: unknown): obj is { total: number } {
    return typeof obj === "object"
        && obj !== null
        && typeof obj["total"] === "number";
}

function isContentDescriptors(obj: unknown): obj is { notes: string } {
    return typeof obj === "object"
        && obj !== null
        && typeof obj["notes"] === "string";
}

export default SteamStatsCommand;