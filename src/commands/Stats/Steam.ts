import { ChatInputCommandInteraction, Client, hyperlink, time } from "discord.js";
import SlashCommand from "../../types/SlashCommand.js";
import SteamAPI from "steamapi";
import config from "../../config.js";
import CreateEmbed from "../../util/CreateEmbed.js";
import { formatDurationFromMinutes } from "../../util/MiscUtils.js";

const regionf = new Intl.DisplayNames("en-UK", { type: "region" });

const steam = new SteamAPI(config.DANGER.STEAM_API_KEY);
const cachedApps = (await steam.getAppList()).filter(app => app.name !== "");

const SteamStatsCommand: SlashCommand = {
    name: "_",

    async run(interaction, client) {
        if (interaction.options.getSubcommand() === "app") {
            return getSteamApp(interaction, client);
        }

        if (interaction.options.getSubcommand() === "user") {
            return getSteamUser(interaction, client);
        }
    },

    async runAutocomplete(interaction, client) {
        const apps = cachedApps.filter(app => app.name.toLowerCase().includes(interaction.options.getString("app").toLowerCase())).slice(0, 25);
        interaction.respond(apps.map(app => { return { name: app.name.slice(0, 100), value: app.appid.toString() }; }));
    }
};

async function getSteamUser(interaction: ChatInputCommandInteraction, client: Client) {
    // if user doesn't start with https, assume it's a user name and append it to the url
    let userURL = interaction.options.getString("user");
    if (/^\d+/.test(userURL)) userURL = `https://steamcommunity.com/profiles/${userURL}`;
    else if (!userURL.startsWith("https")) userURL = `https://steamcommunity.com/id/${userURL}`;

    const userId = await steam.resolve(userURL)
        .then((id) => {
            return id;
        })
        .catch(() => {
            return new Error("Couldn't find user.");
        });

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