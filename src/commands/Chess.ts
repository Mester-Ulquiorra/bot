import { createCanvas, Image } from "canvas";
import * as chess from "chess.js";
import { format } from "date-fns";
import { ActionRowBuilder, APISelectMenuOption, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, GuildMember, InteractionCollector, Message, StringSelectMenuBuilder } from "discord.js";
import * as path from "path";
import { fileURLToPath } from "url";
import SlashCommand from "../types/SlashCommand.js";
import { SnowFlake } from "../Ulquiorra.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const ChessCommand: SlashCommand = {
    name: "chess",

    async run(interaction, client) {
        const member = interaction.options.getMember("member") as GuildMember;

        if (member.id === interaction.user.id)
            return "You can't play against yourself.";

        // check if either the user or the member is in a game
        if (
            ChessGame.getGameByPlayer(interaction.user.id) ||
            ChessGame.getGameByPlayer(member.id)
        )
            return "You or the user you want to play with is already in a game.";

        // create an embed to wait for the user to accept the game
        const waitEmbed = CreateEmbed(
            `**${member}, ${interaction.member} has invited you to play chess! \n Click on the button to accept!**`,
            { title: `Chess game invitation`, color: EmbedColor.Success }
        ).setFooter({ text: "You have 15 seconds to accept the game!" });

        // create the accept button
        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setCustomId("chess.acceptgame")
                    .setEmoji("✅")
                    .setLabel("Accept game")
                    .setStyle(ButtonStyle.Success),
            ]).toJSON(),
        ];

        const message = await interaction.reply({ embeds: [waitEmbed], components, fetchReply: true });

        message.awaitMessageComponent({
            filter: x => x.customId === "chess.acceptgame" && x.user.id === member.id,
            time: 15_000,
            componentType: ComponentType.Button,
        })
            .then((button) => {
                button.deferUpdate();

                // create a new game
                const game = new ChessGame(interaction.member as GuildMember, member, message);

                // add the game to the map
                ChessGame.ActiveGames.set(game.id, game);
            })
            .catch((err) => {
                message.edit({
                    embeds: [
                        CreateEmbed(
                            `You haven't accepted the game in time!`,
                            { color: EmbedColor.Error, title: "Chess game invitation" }
                        )], components: []
                });
            });
    }
};

class ChessGame {
    /**
     * The ID of the game
     */
    id: string;
    /**
     * The white player
     */
    player1: GuildMember;
    /**
     * The black player
     */
    player2: GuildMember;
    /**
     * The winner player (null if game ended with time up)
     */
    winner: GuildMember;
    /**
     * Player currently on turn
     */
    turnPlayer: GuildMember;
    /**
     * The epoch second when the game will expire (+5 minutes after each turn)
     */
    expires: number;
    /**
     * True, if the game has been ended
     */
    ended: boolean;
    /**
     * The message that displays the game state
     */
    message: Message;
    /**
     * The collector for the buttons
     */
    componentCollector: InteractionCollector<ButtonInteraction>;
    /**
     * The message that's currently accepting input from the user;
     */
    inputMessage: Message;
    /**
     * Chess controller
     */
    chessGame: chess.Chess;

    /**
     *
     * @param {GuildMember} player1 The member who started the game
     * @param {GuildMember} player2 The member who was challenged to play
     * @param {Message} message The message that displays the game state
     */
    constructor(player1: GuildMember, player2: GuildMember, message: Message) {
        this.id = SnowFlake.getUniqueID().toString();
        this.player1 = player1;
        this.player2 = player2;

        // randomly swap the players
        if (Math.random() > 0.5) {
            [this.player1, this.player2] = [this.player2, this.player1];
        }

        this.winner = null;

        this.chessGame = new chess.Chess();
        this.chessGame.header("White", `${this.player1.displayName}, ${this.player1.user.discriminator}`,
            "Black", `${this.player2.displayName}, ${this.player2.user.discriminator}`,
            "Site", "Mester's Hub, Discord USA",
            "Date", format(new Date(), "yyyy.MM.dd"),
            "Time", format(new Date(), "HH.mm.ss"),
            "Round", "1");

        this.expires = Math.floor(Date.now() / 1000) + 5 * 60;
        this.ended = false;
        this.message = message;

        // create the message
        const { embed, components, board } = this.generateMessage();

        this.message.edit({
            embeds: [embed],
            files: [{ attachment: board, name: "board.png" }],
            components,
        });

        // create a listener for the buttons
        this.componentCollector = this.message
            .createMessageComponentCollector({
                filter: (x) =>
                    x.user.id === this.player1.id ||
                    x.user.id === this.player2.id,
                componentType: ComponentType.Button,
            })
            .on("collect", this.executeComponent);

        this.performTurn();
    }

    async executeComponent(button: ButtonInteraction) {
        button.deferUpdate();

        // if the button is the forfeit button
        if (button.customId === "chess.forfeit") {
            this.winner = button.user.id === this.player1.id ? this.player2 : this.player1;

            // delete all components
            this.message.edit({ components: [] });

            this.end(`${button.user} has forfeited the game, ${this.winner} wins!`);
        }

        // if the button is the request draw button
        if (button.customId === "chess.requestdraw") {
            // send a message to the other player
            const drawembed = CreateEmbed(`${button.user} has requested a draw!\nYou have 60 seconds to accept/deny`,
                { color: EmbedColor.Warning, });

            const drawcomponents = [
                new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setCustomId("chess.acceptdraw")
                        .setLabel("Accept draw")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("chess.declinedraw")
                        .setLabel("Decline draw")
                        .setStyle(ButtonStyle.Secondary),
                ]).toJSON(),
            ];

            const drawMessage = await this.message.channel.send({
                embeds: [drawembed],
                components: drawcomponents,
                reply: {
                    messageReference: this.message.id,
                    failIfNotExists: false,
                },
            });

            drawMessage
                .awaitMessageComponent({
                    filter: (x: ButtonInteraction) =>
                        x.user.id ===
                        (button.user.id === this.player1.id
                            ? this.player2.id
                            : this.player1.id),
                    time: 60_000,
                    componentType: ComponentType.Button,
                })
                .then(async (drawbutton: ButtonInteraction) => {
                    if (drawbutton.customId === "chess.acceptdraw") {
                        this.end(`${drawbutton.user} has accepted the draw`, true);
                    }
                })
                .finally(() => {
                    drawMessage.delete();
                });
        }
    }

    /**
     * Perform a single turn of the game
     */
    async performTurn() {
        if (this.ended) return;

        this.turnPlayer = this.chessGame.turn() === chess.WHITE ? this.player1 : this.player2;

        // get all pieces the user can move
        const turnPieces: Array<APISelectMenuOption> = [];
        for (const rank of this.chessGame.board()) {
            for (const rawSquare of rank) {
                if (!rawSquare) continue;

                const moves = this.chessGame.moves({ verbose: true, square: rawSquare.square }) as chess.Move[];
                if (moves.length === 0) continue;

                const emoji = await GetGuild().emojis.fetch(ChessGame.getPieceEmoji({ color: rawSquare.color, type: rawSquare.type }));

                const position = rawSquare.square.toString();

                turnPieces.push({
                    value: position,
                    label: position,
                    description: `Move your piece on ${position}!`,
                    emoji: {
                        animated: emoji.animated,
                        name: emoji.name,
                        id: emoji.id
                    }
                });
            }
        }

        const components = [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                new StringSelectMenuBuilder()
                    .setOptions(turnPieces)
                    .setCustomId("chess.piecetomove")
                    .setMaxValues(1)
                    .setMinValues(1)
                    .setPlaceholder("Select your piece to move")
            ]).toJSON()
        ];

        // create the input message and ask for the piece to move
        if (!this.inputMessage) {
            const inputMessage = await this.message.reply({
                content: `${this.turnPlayer}, please select the piece you want to move`,
                components
            });

            this.inputMessage = inputMessage;
        } else {
            await this.inputMessage.edit({
                content: `${this.turnPlayer}, please select the piece you want to move`,
                components
            });
        }

        this.message.channel
            .awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                filter: (i) => i.message.id === this.inputMessage.id && i.user.id === this.turnPlayer.id && i.customId === "chess.piecetomove"
            })
            .then(async (interaction1) => {
                await interaction1.deferUpdate();
                if (this.ended) return;

                const selection = interaction1.values[0];

                const pieceToMove = this.chessGame.get(selection as chess.Square);

                // get all possible moves for that piece
                const moves = this.chessGame.moves({ verbose: true, square: selection as chess.Square }) as chess.Move[];

                // generate a string that shows allowed moves
                const movesOption: Array<APISelectMenuOption> = [{
                    label: "Cancel",
                    value: "cancel",
                    emoji: { name: "❌" },
                    description: "Cancel this move"
                }];

                for (const move of moves) {
                    let thisMoveString = move.to;

                    const pieceToHit = this.chessGame.get(move.to as chess.Square);
                    const emoji = pieceToHit ? await GetGuild().emojis.fetch(ChessGame.getPieceEmoji(pieceToHit)) : undefined;

                    if (move.flags.includes("c") || move.flags.includes("e")) thisMoveString += ` (Capture)`;
                    if (move.flags.includes("k") || move.flags.includes("q")) thisMoveString += ` (Castle)`;

                    movesOption.push({
                        label: thisMoveString,
                        value: move.to,
                        emoji: emoji ? {
                            animated: emoji.animated,
                            name: emoji.name,
                            id: emoji.id
                        } : undefined,
                        description: `Move your piece to ${move.to}`
                    });
                }

                // create a new message that will serve as the move selector
                const components = [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
                        new StringSelectMenuBuilder()
                            .setOptions(movesOption)
                            .setCustomId("chess.movedest")
                            .setMaxValues(1)
                            .setMinValues(1)
                            .setPlaceholder("Select the destination of your piece!")
                    ])
                ];

                const pieceEmoji = await GetGuild().emojis.fetch(ChessGame.getPieceEmoji(pieceToMove));

                await this.inputMessage.edit({
                    content: `Great, now please choose where you want to move your ${pieceEmoji}`,
                    components
                });

                this.message.channel.awaitMessageComponent({
                    componentType: ComponentType.StringSelect,
                    filter: (i) => i.message.id === this.inputMessage.id && i.user.id === this.turnPlayer.id && i.customId === "chess.movedest",
                }).then(async (interaction2) => {
                    await interaction2.deferUpdate();
                    if (this.ended) return;

                    const selection = interaction2.values[0];

                    if (selection === "cancel") return this.performTurn();

                    const move = moves.find(move => move.to === selection);

                    // most likely NEVER going to happen, but you never know
                    if (!move) return this.performTurn();

                    // move the piece
                    this.chessGame.move(move.san);

                    // check if the game is over
                    if (this.chessGame.isGameOver()) {
                        let embedString = "";
                        if (this.chessGame.isDraw()) embedString = "Lmao, it's a draw";
                        else {
                            const winner = this.chessGame.turn() === chess.WHITE ? this.player1 : this.player2;
                            embedString = `${winner} has won the game!`;
                            this.winner = winner;
                        }

                        this.end(embedString, this.chessGame.isDraw());

                        return;
                    }

                    // add expiration time
                    this.expires = Math.floor(Date.now() / 1000) + 5 * 60;

                    // redraw the game board
                    const { embed, components, board } = this.generateMessage();

                    this.message.edit({
                        embeds: [embed],
                        components,
                        files: [
                            {
                                attachment: board,
                                name: "board.png",
                            },
                        ],
                    });

                    this.performTurn();
                }).catch(console.error);
            }).catch(console.error);
    }

    /**
     * A function for drawing the board
     * @returns The game board as a buffer
     */
    generateGameBoard() {
        // create the canvas
        const canvas = createCanvas(ChessGame.BoardSize, ChessGame.BoardSize);
        const ctx = canvas.getContext("2d");

        // fill the canvas with the checkerboard pattern
        // create two counters counting backwards from 7
        const pieceSize = ChessGame.BoardSize / 8;

        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const isWhite = x % 2 === y % 2;

                ctx.fillStyle = isWhite ? "#f2f2f2" : "#f29090";
                ctx.fillRect(
                    x * pieceSize,
                    y * pieceSize,
                    pieceSize,
                    pieceSize
                );
            }
        }

        // create a border around the board
        ctx.strokeStyle = "#55342B";
        ctx.lineWidth = 10;
        ctx.rect(
            ctx.lineWidth / 2,
            ctx.lineWidth / 2,
            ChessGame.BoardSize - ctx.lineWidth,
            ChessGame.BoardSize - ctx.lineWidth
        );
        ctx.stroke();

        // draw the pieces
        const piecePaths = ChessGame.getPieceIcons();
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.chessGame.board()[y][x];

                if (!piece) continue;

                let iconPath = "";

                // convert the piece type and color to an icon path
                switch (piece.type) {
                    case chess.BISHOP:
                        iconPath =
                            piece.color === chess.WHITE
                                ? piecePaths.W_BISHOP
                                : piecePaths.B_BISHOP;
                        break;
                    case chess.KING:
                        iconPath =
                            piece.color === chess.WHITE
                                ? piecePaths.W_KING
                                : piecePaths.B_KING;
                        break;
                    case chess.KNIGHT:
                        iconPath =
                            piece.color === chess.WHITE
                                ? piecePaths.W_KNIGHT
                                : piecePaths.B_KNIGHT;
                        break;
                    case chess.PAWN:
                        iconPath =
                            piece.color === chess.WHITE
                                ? piecePaths.W_PAWN
                                : piecePaths.B_PAWN;
                        break;
                    case chess.QUEEN:
                        iconPath =
                            piece.color === chess.WHITE
                                ? piecePaths.W_QUEEN
                                : piecePaths.B_QUEEN;
                        break;
                    case chess.ROOK:
                        iconPath =
                            piece.color === chess.WHITE
                                ? piecePaths.W_ROOK
                                : piecePaths.B_ROOK;
                        break;
                }

                const image = new Image();
                image.onload = function () {
                    ctx.drawImage(
                        image,
                        x * pieceSize,
                        y * pieceSize,
                        pieceSize,
                        pieceSize
                    );
                };
                image.src = iconPath;
            }
        }

        const textOffset = Math.floor(ChessGame.BoardSize / 512);

        // draw the guide letters and numbers
        ctx.fillStyle = "#8c110d";
        ctx.font = `bold ${textOffset * 20}px consolas`;
        ctx.textAlign = "center";

        // letters
        for (let x = 0; x < 8; x++) {
            ctx.fillText(
                String.fromCharCode(65 + x),
                x * pieceSize + pieceSize / 2,
                7 * pieceSize + (pieceSize - textOffset * 10)
            );
        }

        // numbers
        for (let y = 0; y < 8; y++) {
            ctx.fillText(
                (8 - y).toString(),
                textOffset * 15,
                y * pieceSize + pieceSize / 2 + textOffset * 5
            );
        }

        return canvas.toBuffer("image/png");
    }

    /**
     * A function for generating the game message.
     */
    generateMessage() {
        const embed = CreateEmbed(`**${this.player1} (white) vs. ${this.player2} (black)**\n\nThe game will automatically expire at <t:${this.expires}>`);

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setCustomId("chess.forfeit")
                    .setLabel("Forfeit game")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("chess.requestdraw")
                    .setLabel("Request draw")
                    .setStyle(ButtonStyle.Secondary),
            ]).toJSON(),
        ];

        const board = this.generateGameBoard();

        return {
            embed,
            components,
            board,
        };
    }

    /**
     * Stop the game and remove it from active games
     * @param reason The reason the game has ended.
     */
    end(reason: string, isDraw?: boolean) {
        this.ended = true;

        ChessGame.ActiveGames.delete(this.id);

        if (this.inputMessage) this.inputMessage.delete();

        // stop the interaction collector
        this.componentCollector.stop("The game has ended.");

        if (this.chessGame.isDraw() || !this.winner) this.chessGame.header("Result", "1/2-1/2");
        else if (this.winner.id === this.player1.id) this.chessGame.header("Result", "1-0");
        else if (this.winner.id === this.player2.id) this.chessGame.header("Result", "0-1");

        const pgn = Buffer.from(this.chessGame.pgn({ maxWidth: 10 }), "utf-8");

        const embed = CreateEmbed(`**${reason}**\n\nThe PGN file of this game has been attached for you.\nFEN: ${this.chessGame.fen()}`, { color: this.chessGame.isDraw() || isDraw ? EmbedColor.Warning : EmbedColor.Success });

        // redraw board
        const board = this.generateGameBoard();

        this.message.edit({
            embeds: [embed],
            components: [],
            files: [{ attachment: board, name: "board.png" }, {
                attachment: pgn,
                name: `${this.player1.displayName}-${this.player2.displayName}.pgn`
            }]
        });
    }

    /* ------ Static variables ------ */

    /**
     * The board size in pixels
     */
    static BoardSize = 1024;

    static ActiveGames = new Map<string, ChessGame>();

    /**
     * A function used for finding a game based on a user ID
     * @param id The ID of the user to check
     * @returns An array with the game the user is in and which player they are, or null if they are not in a game
     */
    static getGameByPlayer(id: string) {
        if (ChessGame.ActiveGames.size === 0) return null;

        for (const [_key, game] of ChessGame.ActiveGames) {
            if (game.player1.id === id || game.player2.id === id) {
                return [game, game.player1.id === id ? 1 : 2];
            }
        }
        return null;
    }

    static IconCache: ChessIcons = null;

    /**
     * A static function to get the icons for every piece
     * If it's the first time running the function, it'll also cache the icons
     * @returns An object containing the icons for the pieces
     */
    static getPieceIcons() {
        if (ChessGame.IconCache) return ChessGame.IconCache;

        // the chess icons are in <main-folder>/res/chess
        const chessDir = path.join(__dirname, "..", "res", "chess");

        ChessGame.IconCache = {
            W_PAWN: path.join(chessDir, "W_PAWN.png"),
            W_BISHOP: path.join(chessDir, "W_BISHOP.png"),
            W_KNIGHT: path.join(chessDir, "W_KNIGHT.png"),
            W_ROOK: path.join(chessDir, "W_ROOK.png"),
            W_QUEEN: path.join(chessDir, "W_QUEEN.png"),
            W_KING: path.join(chessDir, "W_KING.png"),
            B_PAWN: path.join(chessDir, "B_PAWN.png"),
            B_BISHOP: path.join(chessDir, "B_BISHOP.png"),
            B_KNIGHT: path.join(chessDir, "B_KNIGHT.png"),
            B_ROOK: path.join(chessDir, "B_ROOK.png"),
            B_QUEEN: path.join(chessDir, "B_QUEEN.png"),
            B_KING: path.join(chessDir, "B_KING.png"),
        };

        return ChessGame.IconCache;
    }

    /**
     * A static function to get the emoji for a piece
     * @param piece The piece to get the emoji for
     * @returns An emoji representing the piece
     */
    static getPieceEmoji(piece: chess.Piece): string {
        switch (piece.type) {
            case chess.PAWN:
                return piece.color === chess.WHITE
                    ? "1005159635038261388"
                    : "1005159627547222156";
            case chess.BISHOP:
                return piece.color === chess.WHITE
                    ? "1005159637051506800"
                    : "1005159629761822720";
            case chess.KNIGHT:
                return piece.color === chess.WHITE
                    ? "1005159633696084029"
                    : "1005159626498646119";
            case chess.ROOK:
                return piece.color === chess.WHITE
                    ? "1005159631099809843"
                    : "1005159623881404497";
            case chess.QUEEN:
                return piece.color === chess.WHITE
                    ? "1005159636330086490"
                    : "1005159628570636288";
            case chess.KING:
                return piece.color === chess.WHITE
                    ? "1005159632081268757"
                    : "1005159625173250190";
            default:
                return "❓";
        }
    }
}

interface ChessIcons {
    W_PAWN: string,
    W_BISHOP: string,
    W_KNIGHT: string,
    W_ROOK: string,
    W_QUEEN: string,
    W_KING: string,
    B_PAWN: string,
    B_BISHOP: string,
    B_KNIGHT: string,
    B_ROOK: string,
    B_QUEEN: string,
    B_KING: string,
}

// create a timer to automatically delete expired games
setInterval(() => {
    for (const [_id, game] of ChessGame.ActiveGames) {
        if (game.expires < Math.floor(Date.now() / 1000)) {
            game.end("The game has expired.");
        }
    }
}, 60 * 1000);

export default ChessCommand;