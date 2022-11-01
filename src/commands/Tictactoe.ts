import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Client, ComponentType, EmbedBuilder, GuildMember, Message, SelectMenuBuilder, User } from "discord.js";
import TictactoeConfig from "../database/TictactoeConfig";
import SlashCommand from "../types/SlashCommand";
import { SnowFlake } from "../Ulquiorra";
import { GetGuild } from "../util/ClientUtils";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";
import GetError from "../util/GetError";
import Log, { LogType } from "../util/Log";
import { CalculateMaxPage } from "../util/MathUtils";

const ActiveGames = new Map<string, TicTacToeGame>();

const NumberToEmoji = new Map([
    [1, "1️⃣"],
    [2, "2️⃣"],
    [3, "3️⃣"],
    [4, "4️⃣"],
    [5, "5️⃣"],
    [6, "6️⃣"],
    [7, "7️⃣"],
    [8, "8️⃣"],
    [9, "9️⃣"],
]);

const TictactoeCommand: SlashCommand = {
    name: "tictactoe",

    async run(interaction, client) {
        switch (interaction.options.getSubcommand()) {
            case "play":
                return play(interaction);

            case "cancel":
                return cancel(interaction);

            case "stats":
                return stats(interaction);

            case "leaderboard":
                return leaderboard(interaction, client);
        }
    },

    async runSelectMenu(interaction, client) {
        // get page
        const page = Number.parseInt(interaction.values[0]);

        // get max page
        const maxPage = await GetMaxPage();

        // check if page is valid
        if (page != 1 && page > maxPage) return "For some super bizarre reason, that page is not available.";

        // get levels
        const levels = await TictactoeConfig.find().sort({ elo: -1 });

        // check if the page is cached
        if (!PageInCache(page)) await CachePage(levels, page, client);

        // now let's read it
        const embed = await ReadPage(page, maxPage);
        if (typeof embed === "string") return embed;

        // edit the interaction
        interaction.update({ embeds: [embed] });
    }

};

async function play(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("member") as GuildMember;
    if(!member) return GetError("MemberUnavailable");


    if (member.id === interaction.user.id)
        return "You can't play against yourself.";

    // check if either the user or the member is in a game
    if (
        TicTacToeGame.getGameByPlayer(interaction.user.id) ||
        TicTacToeGame.getGameByPlayer(member.id)
    )
        return "You or the user you want to play with is already in a game.";

    // create an embed to wait for the user to accept the game
    const waitEmbed = CreateEmbed(
        `**${member}, ${interaction.member} has invited you to play tictactoe! \n Click on the button to accept!**`,
        { title: `Tictactoe game invitation`, color: EmbedColor.Success }
    ).setFooter({ text: "You have 15 seconds to accept the game!" });

    // create the accept button
    const components = [
        new ActionRowBuilder().addComponents([
            new ButtonBuilder()
                .setCustomId("tictactoe.acceptgame")
                .setEmoji("✅")
                .setLabel("Accept game")
                .setStyle(ButtonStyle.Success),
        ]).toJSON() as APIActionRowComponent<any>,
    ];

    // send the embed and also fetch the reply
    const reply = await interaction
        .reply({
            embeds: [waitEmbed],
            components,
        })
        .then(async () => {
            return interaction.fetchReply();
        });

    reply
        .awaitMessageComponent({ 
            filter: (x) => x.customId === "tictactoe.acceptgame" && x.user.id === member.id, 
            time: 15_000, 
            componentType: ComponentType.Button })
        .then((button) => {
            // create a new game
            const game = new TicTacToeGame(
                interaction.user,
                member.user,
                reply
            );

            // add the game to the map
            ActiveGames.set(game.id, game);

            // send the game embed
            const gameBoard = game.generateGameBoard();

            interaction.editReply({
                embeds: [gameBoard[0]],
                components: gameBoard[1],
            });

            button.deferUpdate();
        })
        .catch(() => {
            const embed = CreateEmbed(
                `You haven't accepted the game in time!`,
                { color: EmbedColor.Error, title: "Tictactoe game invitation" }
            );

            interaction.editReply({ embeds: [embed], components: [] });
        });
}

async function cancel(interaction: ChatInputCommandInteraction) {
    // check if the user is in a game
    const [game, playernumber] = TicTacToeGame.getGameByPlayer(interaction.user.id);

    if (!game) return "You are not in a game.";

    game.winner = playernumber === 1 ? 2 : 1;

    game.end(`${interaction.user} cancelled the game.`);

    interaction.deferReply().then(() => {
        interaction.deleteReply();
    });
}

async function stats(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getUser("member", false);

    const stats =
        member == null
            ? await getTictactoeStat(interaction.user.id)
            : await getTictactoeStat(member.id);

    const drawn_games =
        stats.games_played - stats.games_won - stats.games_lost;

    let win_percentage =
        (stats.games_won * 100) / (stats.games_played - drawn_games);
    if (isNaN(win_percentage)) win_percentage = 0;

    const embed = CreateEmbed(
        `**${member || "Your"}${member != null ? "'s" : ""
        } tictactoe stats**`
    ).addFields([
        {
            name: "Games played",
            value: stats.games_played.toString(),
            inline: true,
        },
        {
            name: "Games won",
            value: stats.games_won.toString(),
            inline: true,
        },
        {
            name: "Games lost",
            value: stats.games_lost.toString(),
            inline: true,
        },
        {
            name: "Games drawn",
            value: drawn_games.toString(),
            inline: true,
        },
        {
            name: "Win percentage (not including draws)",
            value: win_percentage.toFixed(2) + "%",
            inline: true,
        },
        {
            name: "ELO",
            value: stats.elo.toString(),
            inline: true,
        },
    ]);

    interaction.reply({ embeds: [embed], ephemeral: true });
}

async function leaderboard(interaction: ChatInputCommandInteraction, client: Client) {
    // defer the interaction, since caching might take some time
    await interaction.deferReply({ ephemeral: true });

    // get all levels
    const stats = await TictactoeConfig.find().sort({ elo: -1 });

    // get the page
    const page = interaction.options.getInteger("page") ?? 1;

    // get max page
    const maxPage = await GetMaxPage();

    if (stats.length === 0) return "Don't know how, but there are no people with a tictactoe stat.";

    // check if page is valid
    if (page != 1 && page > maxPage) return "That page is not available.";

    // check if the page is cached
    if (!PageInCache(page)) await CachePage(stats, page, client);

    // we should now have the page in cache
    const embed = await ReadPage(page, maxPage);
    if (typeof embed === "string") return embed;

    // show embed
    interaction.editReply({
        embeds: [embed],
        components: [GetPageSelector(maxPage).toJSON() as APIActionRowComponent<any>],
    });
}

/**
 * @param user The id of the user.
 */
async function getTictactoeStat(user: string) {
    let stats = await TictactoeConfig.findOne({ user });

    if (stats == null) stats = await TictactoeConfig.create({ user });

    return stats;
}

class TicTacToeGame {
    /**
     * The ID of the game
     */
    id: string;
    /**
     * The member who started the game
     */
    player1: User;
    /**
     * The member who was challenged to play
     */
    player2: User;
    /**
     * The game board, a 3x3 array of numbers. null = empty, 1 = player1, 2 = player2
     */
    board: Array<Array<number>>;
    /**
     * Whose turn is it? 1 = player1, 2 = player2
     */
    turn: number;
    /**
     * The epoch second when the game will expire (usually +60 seconds after each turn)
     */
    expires: number;
    /**
     * The winner player, 1 = player1, 2 = player2, 0 = no winner, -1 = game ended
     */
    winner: number;
    /**
     * The message that displays the game state
     */
    message: Message;
    /**
     * Arrray containing the stats of the players
     */
    stats = [null, null];

    /**
     *
     * @param player1 The member who started the game
     * @param player2 The member who was challenged to play
     * @param message The message that displays the game state
     */
    constructor(player1: User, player2: User, message: Message) {
        this.id = SnowFlake.getUniqueID().toString();
        this.player1 = player1;
        this.player2 = player2;
        this.board = [
            [null, null, null],
            [null, null, null],
            [null, null, null],
        ];
        // turn is a random number between 1 and 2
        this.turn = Math.floor(Math.random() * 2) + 1;
        this.expires = Math.floor(Date.now() / 1000) + 60;
        this.winner = 0;
        this.message = message;

        // increase both player's games played (sorry for the messy code)
        getTictactoeStat(player1.id).then(async (stats1) => {
            this.stats[0] = stats1;
            stats1.games_played++;
            await stats1.save();

            getTictactoeStat(player2.id).then(async (stats2) => {
                this.stats[1] = stats2;
                stats2.games_played++;
                await stats2.save();

                // perform the first turn
                this.performTurn();
            });
        });
    }

    /**
     * A function used to perform a turn
     */
    performTurn() {
        // create a filter for the buttons
        const filter = (button: ButtonInteraction) =>
            button.customId.match(/tictactoe.board[1-9]/) &&
            button.user.id ===
            (this.turn === 1 ? this.player1.id : this.player2.id);

        // wait for a button to be pressed
        this.message
            .awaitMessageComponent({ filter, time: 60_000 })
            .then((button: ButtonInteraction) => {
                button.deferUpdate();

                // check if game is still in progress
                if (!ActiveGames.has(this.id)) return;

                // get the number the button corresponds to
                const number = parseInt(
                    button.customId[button.customId.length - 1]
                );

                // get x and y coordinates
                const y = Math.floor((number - 1) / 3);
                const x = (number - 1) % 3;

                // make that cell the turn's player
                this.board[x][y] = this.turn;

                // check if the game is over
                if (this.getWinner()) {
                    this.message.edit({
                        components: this.generateGameBoard()[1],
                    });

                    return;
                }

                // make the other player the turn
                this.turn = this.turn === 1 ? 2 : 1;

                // regenerate the game board
                const gameBoard = this.generateGameBoard();

                this.message.edit({
                    embeds: [gameBoard[0]],
                    components: gameBoard[1],
                });

                // perform the next turn
                this.performTurn();
            })
            .catch(() => {
                // this should honestly never happen, so let's not give a shit about it
                return null;
            });
    }

    /**
     * A function for getting and showing the winner
     * @returns {boolean} True if the game is over, false if not
     */
    getWinner() {
        const winner = this.checkWinner();

        if (winner === 0) return false;

        let winnerString = "";

        if (winner === 1) winnerString = `${this.player1} won!`;
        if (winner === 2) winnerString = `${this.player2} won!`;
        if (winner === 3) winnerString = `It's a draw!`;

        const embed = CreateEmbed(winnerString, {
            title: `${this.player1.username} vs ${this.player2.username}`,
            color: winner !== 3 ? EmbedColor.Success : EmbedColor.Warning,
        });
        this.message.edit({ embeds: [embed] });

        this.winner = winner;
        this.end();

        return true;
    }

    /**
     * A function for checking the winner. 0 = no winner, 1 = player1, 2 = player2, 3 = draw
     */
    checkWinner() {
        // check rows
        for (let y = 0; y < 3; y++) {
            if (
                this.board[0][y] === this.board[1][y] &&
                this.board[1][y] === this.board[2][y] &&
                this.board[0][y] != null
            ) {
                return this.board[0][y];
            }
        }

        // check columns
        for (let x = 0; x < 3; x++) {
            if (
                this.board[x][0] === this.board[x][1] &&
                this.board[x][1] === this.board[x][2] &&
                this.board[x][0] != null
            ) {
                return this.board[x][0];
            }
        }

        // check diagonals
        if (
            this.board[0][0] === this.board[1][1] &&
            this.board[1][1] === this.board[2][2] &&
            this.board[0][0] != null
        ) {
            return this.board[0][0];
        }

        if (
            this.board[0][2] === this.board[1][1] &&
            this.board[1][1] === this.board[2][0] &&
            this.board[0][2] != null
        ) {
            return this.board[0][2];
        }

        // check for a draw
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                if (this.board[x][y] == null) {
                    return 0;
                }
            }
        }

        return 3;
    }

    /**
     * A function used for turning the game board into a message with components
     * @returns An array with the embed and components
     */
    generateGameBoard(): [EmbedBuilder, Array<APIActionRowComponent<any>>] {
        // the description should contain whose turn it is
        const turnString =
            this.turn === 1
                ? `It's ${this.player1}'s turn.`
                : `It's ${this.player2}'s turn.`;

        const embed = CreateEmbed(turnString, {
            title: `**${this.player1.username} vs. ${this.player2.username}**`,
        });

        const components: Array<APIActionRowComponent<any>> = [];

        // iterate over the board

        for (let y = 0; y < 3; y++) {
            const row = new ActionRowBuilder();
            for (let x = 0; x < 3; x++) {
                row.addComponents(this.generateGameBoardButton(x, y));
            }
            components.push(row.toJSON() as APIActionRowComponent<any>);
        }

        return [embed, components];
    }

    /**
     *
     * @param x The x coordinate of the button
     * @param y The y coordinate of the button
     */
    generateGameBoardButton(x: number, y: number) {
        const number_position = y * 3 + x + 1;

        let emoji = "";

        if (this.board[x][y] === null) {
            emoji = NumberToEmoji.get(number_position);
        } else {
            emoji = this.board[x][y] === 1 ? "❌" : "⭕";
        }

        return new ButtonBuilder()
            .setCustomId(`tictactoe.board${number_position}`)
            .setEmoji(emoji)
            .setDisabled(this.board[x][y] !== null)
            .setStyle(ButtonStyle.Primary);
    }

    /**
     *
     * @param reason The reason for the game ending
     */
    async end(reason?: string) {
        ActiveGames.delete(this.id);

        // change the stats based on winner
        if (this.winner === 1) {
            this.stats[0].games_won++;
            this.stats[1].games_lost++;
        } else if (this.winner === 2) {
            this.stats[1].games_won++;
            this.stats[0].games_lost++;
        }

        this.stats[0].elo = getElo(this.stats[0]);
        this.stats[1].elo = getElo(this.stats[1]);

        await this.stats[0].save();
        await this.stats[1].save();

        if (reason != null) {
            const embed = CreateEmbed(`**${reason}**`, { color: EmbedColor.Error });

            this.message.edit({ embeds: [embed] });
        }
    }

    /* ----- Static utility methods ----- */

    /**
     * A function used for finding a game based on a user ID
     * @param {string} id The ID of the user to check
     * @returns An array with the game the user is in and which player they are, or null if they are not in a game
     */
    static getGameByPlayer(id: string): [TicTacToeGame, number] {
        if (ActiveGames.size === 0) return null;

        for (let [_key, game] of ActiveGames) {
            if (game.player1.id === id || game.player2.id === id) {
                return [game, game.player1.id === id ? 1 : 2];
            }
        }
        return null;
    }
}

// create a timer that deletes expired games every 60 seconds
setInterval(() => {
    const currentTime = Math.floor(Date.now() / 1000);

    for (let [_key, game] of ActiveGames) {
        if (game.expires < currentTime && game.expires !== -1) {
            game.end(`The game has expired.`);
        }
    }
}, 60 * 1000);

const getElo = (stats: any) => {
    // calculate ELO, 1000 is the default ELO, 1 win = +2, 1 loss = -3, min ELO is 0
    return Math.max(0, 1000 + stats.games_won * 2 - stats.games_lost * 3);
};

/* ------- Leaderboard stuff ------- */

const PAGE_SIZE = 10;
/**
 * A map to hold all the pages as a cache.
 */
const CACHE = new Map<number, PageCache[]>();

interface PageCache {
    name: string,
    stats: any,
};

/**
 * A function for checking if a page is in cache.
 * @param page The page to check.
 * @returns If the page is in cache.
 */
function PageInCache(page: number) {
    return CACHE.has(page);
}

/**
 * A function for getting a page from the cache.
 * @param page The page to get.
 * @param force If set to true, it will CREATE that page.
 * @param values Only works if force is true, basically the values to add to cache.
 * @returns
 */
function GetPageFromCache(page: number, force: boolean = false, values?: PageCache[]) {
    if (force) return CACHE.set(page, values);

    return PageInCache(page) ? CACHE.get(page) : null;
}

/**
 * A function for reading a page from the cache.
 * @param page The page to read from.
 * @param maxPage The max page available.
 */
async function ReadPage(page: number, maxPage: number): Promise<EmbedBuilder | string> {
    if (!PageInCache(page))
        return "That page is not cached, which should NOT happen";

    // get page from cache
    const cachepage = GetPageFromCache(page) as PageCache[];

    const embed = CreateEmbed(
        `**Tictactoe leaderboard of ${GetGuild().name}**`,
        {
            title: `Tictactoe leaderboard (page ${page} / ${maxPage})`,
        }
    ).setFooter({
        text: "The leaderboard is cached, it refreshes every 15 minutes!",
    });

    // read from the page
    for (let i = 0; i < PAGE_SIZE; i++) {
        if (!cachepage[i]) break; // we have reached the end of the page

        const stats = cachepage[i].stats;

        const ELO = getElo(stats);

        let win_percentage = (stats.games_won * 100) / stats.games_played;
        if (isNaN(win_percentage)) win_percentage = 0;

        embed.addFields([
            {
                // this part figures out the position of the rank in the leaderboard
                name: `${((page - 1) * PAGE_SIZE + i + 1).toString()}. ${cachepage[i].name
                    }`,

                value: `Games played: ${stats.games_played} | Games won: ${stats.games_won} | Games lost: ${stats.games_lost}\nWin percentage: ${win_percentage.toFixed(2) + "%"} | ELO: ${ELO}`,

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
    const levelcount = await TictactoeConfig.countDocuments();

    return CalculateMaxPage(levelcount, PAGE_SIZE);
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
            .setCustomId("tictactoe.lbpageselector")
            .setMaxValues(1)
            .setOptions(options),
    ]);
}

/**
 * A function for caching a page.
 * @param {any} stats The stats to cache.
 * @param {number} page The page to cache.
 * @param {Client} client The bot client.
 */
async function CachePage(stats: any[], page: number, client: Client) {
    // create a buffer to later write into cache
    const buffer = new Array<PageCache>(PAGE_SIZE);

    // create the start index for levels
    const start_index = (page - 1) * PAGE_SIZE;

    // now read PAGE_SIZE levels
    for (
        let j = start_index;
        j < start_index + PAGE_SIZE && j < stats.length;
        j++
    ) {
        // read level
        const stat = stats[j];

        // try to get name
        const user = await client.users
            .fetch(stat.user)
            .catch(() =>  Log(`Couldn't fetch user, perhaps they left?`, LogType.Warn));

        // get the name (user might be null, then we should use Unknown)
        const name = user ? user.tag : "Unknown";

        // write to buffer
        buffer[j - start_index] = {
            name, stats: stat,
        };
    }

    // write buffer to cache
    CACHE.set(page, buffer);
}

// let's set up a one hour timer to reset the cache
setInterval(() => {
    if (CACHE.size === 0) return;
    CACHE.clear();
}, 1000 * 60 * 15); // 15 minutes

export default TictactoeCommand;