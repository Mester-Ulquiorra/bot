import { createCanvas, Image } from "canvas";
import { ActionRowBuilder, APIActionRowComponent, ButtonBuilder, ButtonInteraction, ButtonStyle, Client, ComponentType, EmojiResolvable, GuildMember, InteractionCollector, Message } from "discord.js";
import * as path from "path";
import SlashCommand from "../types/SlashCommand";
import { SnowFlake } from "../Ulquiorra";
import { GetGuild } from "../util/ClientUtils";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed";

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
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId("chess.acceptgame")
                    .setEmoji("✅")
                    .setLabel("Accept game")
                    .setStyle(ButtonStyle.Success),
            ]).toJSON() as APIActionRowComponent<any>,
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
            .catch(() => {
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
     * The game board, a 8x8 array of Piece elements.
     * The player and type data is in the Piece class
     */
    board: Piece[][];
    /**
     * Whose turn is it? 1 = player1, 2 = player2
     */
    turn: number;
    /**
     * The epoch second when the game will expire (+5 minutes after each turn)
     */
    expires: number;
    /**
     * The winner player, 1 = player1, 2 = player2, 0 = no winner
     */
    winner: number;
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
            const temp = this.player1;
            this.player1 = this.player2;
            this.player2 = temp;
        }

        this.board = ChessGame.generateDefaultGameBoard();

        this.turn = 1;
        this.expires = Math.floor(Date.now() / 1000) + 5 * 60;
        this.winner = 0;
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
            .on("collect", async (button) => {
                button.deferUpdate();

                // if the button is the forfeit button
                if (button.customId === "chess.forfeit") {
                    this.winner = button.user.id === this.player1.id ? 2 : 1;

                    // delete all components
                    this.message.edit({ components: [] });

                    this.end(
                        `${button.user} has forfeited the game, ${button.user.id === this.player1.id
                            ? this.player2
                            : this.player1
                        } wins!`
                    );
                }

                // if the button is the request draw button
                if (button.customId === "chess.requestdraw") {
                    // send a message to the other player
                    const drawembed = CreateEmbed(
                        `${button.user} has requested a draw!\nYou have 60 seconds to accept/deny`,
                        {
                            color: EmbedColor.Warning,
                        }
                    );

                    const drawcomponents = [
                        new ActionRowBuilder().addComponents([
                            new ButtonBuilder()
                                .setCustomId("chess.acceptdraw")
                                .setLabel("Accept draw")
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId("chess.declinedraw")
                                .setLabel("Decline draw")
                                .setStyle(ButtonStyle.Secondary),
                        ]).toJSON() as APIActionRowComponent<any>,
                    ];

                    const drawmessage = await this.message.channel.send({
                        embeds: [drawembed],
                        components: drawcomponents,
                        reply: {
                            messageReference: this.message.id,
                            failIfNotExists: false,
                        },
                    });

                    drawmessage
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
                            drawmessage.delete();

                            if (drawbutton.customId === "chess.acceptdraw") {
                                this.winner = -1;

                                this.message.edit({
                                    embeds: [
                                        CreateEmbed(`${drawbutton.user} has accepted the draw`,
                                            { color: EmbedColor.Warning }
                                        ),
                                    ],
                                });

                                this.end();
                            }
                        })
                        .catch(() => {
                            drawmessage.delete();
                        });
                }
            });

        this.performTurn();
    }

    /**
     * Perform a single turn of the game
     */
    async performTurn() {
        this.inputMessage = null;
        if (this.winner !== 0) return;

        // create the input message and ask for the piece to move
        const pieceMessage = await this.message.channel.send({
            content: `${this.turn === 1 ? this.player1 : this.player2}, please reply to this message with the piece you want to move (for example: "G2", case insensitive)`
        });

        this.inputMessage = pieceMessage;

        this.message.channel
            .awaitMessages({
                filter: (m) => m.author.id === (this.turn === 1 ? this.player1.id : this.player2.id) && m.reference?.messageId === pieceMessage.id,
                max: 1
            })
            .then(async (collected) => {
                const message = collected.first();
                pieceMessage.delete();

                if (this.winner !== 0) {
                    message.delete();
                    return;
                }

                if (message.content.length !== 2) {
                    message.react("❌")
                    return this.performTurn();
                }

                // get the x and y values
                const selection = message.content.toUpperCase();
                const x = selection[0].charCodeAt(0) - 65;
                const y = 8 - Number.parseInt(selection[1]);

                // check if x and y are out of bounds
                if (x < 0 || x > 7 || y < 0 || y > 7) {
                    message.react("❌")
                    return this.performTurn();
                }

                const destPiece = this.getPiece(x, y);

                if (destPiece == null || destPiece?.color !== this.turn) {
                    message.react("❌")
                    return this.performTurn();
                }

                // get all possible moves for that piece
                const allowedMoves = ChessGame.getAllowedMoves(this.board, this.getPiece(x, y), x, y);

                if (allowedMoves.length === 0) {
                    message.react("❌")
                    return this.performTurn();
                }

                // generate a string that shows allowed moves
                let allowedMovesString: string | string[] = [];
                for (const allowedMove of allowedMoves) {
                    let thisMoveString = "";

                    const pieceToHit = this.getPiece(allowedMove.x, allowedMove.y);
                    const thisPiece = this.getPiece(x, y);
                    const emoji = pieceToHit != null ? await GetGuild().emojis.fetch(ChessGame.getPieceEmoji(pieceToHit)) : null;

                    thisMoveString = String.fromCharCode(allowedMove.x + 65) + (8 - allowedMove.y).toString();

                    if (pieceToHit != null && pieceToHit.type !== PieceType.King) thisMoveString += ` (Capture ${emoji})`;
                    if (pieceToHit != null && pieceToHit.type === PieceType.King) thisMoveString += ` (Win the game)`
                    if (thisPiece.type === PieceType.King && !thisPiece.hasMoved && Math.abs(x - allowedMove.x) > 1) thisMoveString += ` (Castle)`;

                    allowedMovesString.push(thisMoveString);
                };
                allowedMovesString = allowedMovesString.join(", ");

                // create a new message that will serve as the move selector
                const emoji = await GetGuild().emojis.fetch(ChessGame.getPieceEmoji(destPiece));

                const moveMessage = await message.reply({
                    content: `Great, now please choose where you want to move your ${emoji} (type "cancel" if you want to cancel your move)\nYour available moves: ${allowedMovesString}`
                }).then((x) => { message.delete(); return x; });

                this.inputMessage = moveMessage;

                this.message.channel.awaitMessages({
                    filter: (_) => _.author.id === message.author.id && _.reference?.messageId === moveMessage.id,
                    max: 1
                }).then(async (collected2) => {
                    const message2 = collected2.first();
                    message2.delete().then(() => { moveMessage.delete(); });

                    if (this.winner !== 0) {
                        message2.delete();
                        return
                    }

                    if (message.content.length !== 2 || message2.content === "cancel") return this.performTurn();

                    // get the x and y values
                    const selection = message2.content.toUpperCase();
                    const x2 = selection[0].charCodeAt(0) - 65;
                    const y2 = 8 - Number.parseInt(selection[1]);

                    // check if that's an allowed move
                    let goodMove = false;
                    for (const allowedMove of allowedMoves) {
                        if (allowedMove.x === x2 && allowedMove.y === y2) {
                            goodMove = true;
                            break;
                        }
                    }
                    if (!goodMove) return this.performTurn();

                    // move the piece
                    this.movePiece(x, y, x2, y2);

                    // check if the game is over
                    if (this.winner !== 0) return;

                    // change the turn
                    this.turn = this.turn === 1 ? 2 : 1;

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
            })
            .catch(console.error);
    }

    /**
     * A function for drawing the board
     * @returns The game board as a buffer
     */
    generateGameBoard() {
        // create the canvas
        const canvas = createCanvas(ChessGame.BoardSize, ChessGame.BoardSize);
        const context = canvas.getContext("2d");

        // fill the canvas with the checkerboard pattern
        // create two counters counting backwards from 7
        const pieceSize = ChessGame.BoardSize / 8;

        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                let isWhite = x % 2 === y % 2;

                context.fillStyle = isWhite ? "#f2f2f2" : "#f29090";
                context.fillRect(
                    x * pieceSize,
                    y * pieceSize,
                    pieceSize,
                    pieceSize
                );
            }
        }

        // create a border around the board
        context.strokeStyle = "#55342B";
        context.lineWidth = 10;
        context.rect(
            context.lineWidth / 2,
            context.lineWidth / 2,
            ChessGame.BoardSize - context.lineWidth,
            ChessGame.BoardSize - context.lineWidth
        );
        context.stroke();

        // draw the pieces
        const piecePaths = ChessGame.getPieceIcons();
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const piece = this.board[y][x];

                if (!piece) continue;

                let iconPath = "";

                // convert the piece type and color to an icon path
                switch (piece.type) {
                    case PieceType.Bishop:
                        iconPath =
                            piece.color === 1
                                ? piecePaths.W_BISHOP
                                : piecePaths.B_BISHOP;
                        break;
                    case PieceType.King:
                        iconPath =
                            piece.color === 1
                                ? piecePaths.W_KING
                                : piecePaths.B_KING;
                        break;
                    case PieceType.Knight:
                        iconPath =
                            piece.color === 1
                                ? piecePaths.W_KNIGHT
                                : piecePaths.B_KNIGHT;
                        break;
                    case PieceType.Pawn:
                        iconPath =
                            piece.color === 1
                                ? piecePaths.W_PAWN
                                : piecePaths.B_PAWN;
                        break;
                    case PieceType.Queen:
                        iconPath =
                            piece.color === 1
                                ? piecePaths.W_QUEEN
                                : piecePaths.B_QUEEN;
                        break;
                    case PieceType.Rook:
                        iconPath =
                            piece.color === 1
                                ? piecePaths.W_ROOK
                                : piecePaths.B_ROOK;
                        break;
                }

                const image = new Image();
                image.onload = function () {
                    context.drawImage(
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
        context.fillStyle = "#8c110d";
        context.font = `bold ${textOffset * 20}px consolas`;
        context.textAlign = "center";

        // letters
        for (let x = 0; x < 8; x++) {
            context.fillText(
                String.fromCharCode(65 + x),
                x * pieceSize + pieceSize / 2,
                7 * pieceSize + (pieceSize - textOffset * 10)
            );
        }

        // numbers
        for (let y = 0; y < 8; y++) {
            context.fillText(
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
        const embed = CreateEmbed(
            `!!! The game is in a beta version, there's no automatic check and check mate detection yet, you win by capturing the enemy king manually !!!`,
            {
                title: `${this.player1.displayName} (white) vs. ${this.player2.displayName} (black)`,
            }
        ).setFooter({ text: "The game expires after 5 minutes of no activity." });

        const components = [
            new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId("chess.forfeit")
                    .setLabel("Forfeit game")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("chess.requestdraw")
                    .setLabel("Request draw")
                    .setStyle(ButtonStyle.Secondary),
            ]).toJSON() as APIActionRowComponent<any>,
        ];

        const board = this.generateGameBoard();

        return {
            embed,
            components,
            board,
        };
    }

    /**
     *
     * @param x The x position of the piece
     * @param y The y position of the piece
     * @returns The piece at the given position
     */
    getPiece(x: number, y: number) {
        return this.board[y][x];
    }

    /**
     *
     * @param x1 The x position of the piece
     * @param y1 The y position of the piece
     * @param x2 The x position of the destination
     * @param y2 The y position of the destination
     */
    movePiece(x1: number, y1: number, x2: number, y2: number) {
        const destPiece = this.getPiece(x2, y2);

        const piece = this.getPiece(x1, y1);
        piece.hasMoved = true;
        this.board[y1][x1] = null;
        this.board[y2][x2] = piece;

        // check if destPiece is a king
        if (destPiece && destPiece.type === PieceType.King) {
            this.winner = this.turn;

            // redraw board
            const board = this.generateGameBoard();

            const embed = CreateEmbed(
                `${this.turn === 1 ? this.player1 : this.player2
                } has won the game!`,
                { color: EmbedColor.Success }
            );

            this.message.edit({
                embeds: [embed],
                files: [{ attachment: board, name: "board.png" }],
            });

            this.end();

            return;
        }

        // check if the piece is a king and we're trying to castle
        if (piece.type === PieceType.King) {
            if (x1 === 4 && x2 === 2) {
                // move the rook
                this.movePiece(0, y1, 3, y1);
            }

            if (x1 === 4 && x2 === 6) {
                // move the rook
                this.movePiece(7, y1, 5, y1);
            }
        }
    }

    /**
     * Stop the game and remove it from active games
     * @param reason The reason the game has ended.
     */
    end(reason?: string) {
        ChessGame.ActiveGames.delete(this.id);

        if (this.inputMessage) this.inputMessage.delete();

        // stop the interaction collector
        this.componentCollector.stop("The game has ended.");

        // delete components
        this.message.edit({ components: [] });

        if (reason == null) return;

        const embed = CreateEmbed(`**${reason}**`, { color: EmbedColor.Error });

        this.message.edit({ embeds: [embed] });
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

        for (let [_key, game] of ChessGame.ActiveGames) {
            if (game.player1.id === id || game.player2.id === id) {
                return [game, game.player1.id === id ? 1 : 2];
            }
        }
        return null;
    }

    /**
     * A static function for generating the default game board
     */
    static generateDefaultGameBoard() {
        const board: Piece[][] = [];

        for (let i = 0; i < 8; i++) {
            // if the row is not 0, 1, 6, 7, fill it with 8 null pieces
            if (i > 1 && i < 6) {
                board[i] = [null, null, null, null, null, null, null, null];
                continue;
            }

            // if the row is 1 or 6, fill it with 8 pawn pieces
            if (i === 1 || i === 6) {
                board[i] = [
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                    new Piece(i === 1 ? "Black" : "White", PieceType.Pawn),
                ];
                continue;
            }

            // otherwise fill it with R, Kn, B, Q, Ki, B, Kn, R
            board[i] = [
                new Piece(i === 0 ? "Black" : "White", PieceType.Rook),
                new Piece(i === 0 ? "Black" : "White", PieceType.Knight),
                new Piece(i === 0 ? "Black" : "White", PieceType.Bishop),
                new Piece(i === 0 ? "Black" : "White", PieceType.Queen),
                new Piece(i === 0 ? "Black" : "White", PieceType.King),
                new Piece(i === 0 ? "Black" : "White", PieceType.Bishop),
                new Piece(i === 0 ? "Black" : "White", PieceType.Knight),
                new Piece(i === 0 ? "Black" : "White", PieceType.Rook),
            ];
        }
        return board;
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
        const chessDir = path.join(path.dirname(require.main.filename), "res", "chess");

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

    static getPieceName(type: PieceType) {
        switch (type) {
            case PieceType.Pawn:
                return "Pawn";
            case PieceType.Bishop:
                return "Bishop";
            case PieceType.Knight:
                return "Knight";
            case PieceType.Rook:
                return "Rook";
            case PieceType.Queen:
                return "Queen";
            case PieceType.King:
                return "King";
            default:
                return "#ERROR#";
        }
    }

    /**
     * A static function to get the emoji for a piece
     * @param piece The piece to get the emoji for
     * @returns An emoji representing the piece
     */
    static getPieceEmoji(piece: Piece): string {
        switch (piece.type) {
            case PieceType.Pawn:
                return piece.color === 1
                    ? "1005159635038261388"
                    : "1005159627547222156";
            case PieceType.Bishop:
                return piece.color === 1
                    ? "1005159637051506800"
                    : "1005159629761822720";
            case PieceType.Knight:
                return piece.color === 1
                    ? "1005159633696084029"
                    : "1005159626498646119";
            case PieceType.Rook:
                return piece.color === 1
                    ? "1005159631099809843"
                    : "1005159623881404497";
            case PieceType.Queen:
                return piece.color === 1
                    ? "1005159636330086490"
                    : "1005159628570636288";
            case PieceType.King:
                return piece.color === 1
                    ? "1005159632081268757"
                    : "1005159625173250190";
            default:
                return "❓";
        }
    }

    /**
     *
     * @param board The game board
     * @param piece The piece to get the allowed positions of
     * @param x The x position of the piece
     * @param y The y position of the piece
     * @returns An array of allowed positions
     */
    static getAllowedMoves(board: Piece[][], piece: Piece, x: number, y: number) {
        const allowedMoves: Array<ChessMove> = [];

        // every move set is different for each piece type
        switch (piece.type) {
            case PieceType.Pawn:
                // this one is the simplest
                // it can move forward one or two squares, and can capture diagonally
                // it can't move backwards

                // first check if there is a piece in front of the pawn
                const forwardY = piece.color === 1 ? -1 : 1;

                if (board[y + forwardY]?.[x] == null)
                    // add that square to the allowed moves
                    allowedMoves.push({ x: x, y: y + forwardY });

                // check if the pawn is in its default position
                if (y === (piece.color === 1 ? 6 : 1))
                    if (
                        board[y + forwardY]?.[x] == null &&
                        board[y + forwardY * 2]?.[x] == null
                    )
                        // check if there are no pieces in front of the pawn
                        // add the square two squares in front of the pawn to the allowed moves
                        allowedMoves.push({ x: x, y: y + forwardY * 2 });

                // check if there is a piece diagonally in front of the pawn
                const diagPos = [
                    [y + forwardY, x + 1],
                    [y + forwardY, x - 1],
                ];

                for (const pos of diagPos) {
                    // check if x is out of bounds
                    if (pos[1] < 0 || pos[1] > 7) continue;

                    // since this move can potentially hit our own piece, check if the piece is not our own
                    if (
                        board[pos[0]]?.[pos[1]] != null &&
                        board[pos[0]]?.[pos[1]]?.color !== piece.color
                    )
                        // add that square to the allowed moves
                        allowedMoves.push({ x: pos[1], y: pos[0] });
                }

                return allowedMoves;

            case PieceType.Knight:
                // a knight can move in an L shape
                // this means 2 in one direction and 1 in the other

                // generate every possible x and y position that mach the L shape
                const LShapes = [
                    [y + 1, x + 2],
                    [y + 1, x - 2],
                    [y - 1, x + 2],
                    [y - 1, x - 2],
                    [y + 2, x + 1],
                    [y + 2, x - 1],
                    [y - 2, x + 1],
                    [y - 2, x - 1],
                ];

                for (const LShape of LShapes) {
                    // check if it's out of bounds
                    if (
                        LShape[0] < 0 ||
                        LShape[0] > 7 ||
                        LShape[1] < 0 ||
                        LShape[1] > 7
                    )
                        continue;

                    // check if we're trying to hit our own piece
                    if (board[LShape[0]][LShape[1]]?.color === piece.color)
                        continue;

                    allowedMoves.push({ x: LShape[1], y: LShape[0] });
                }

                return allowedMoves;

            case PieceType.Rook:
                // a rook can move in a diagonal direction
                // do a linear scan in each direction
                // we also have to offset the index otherwise we'll literally hit ourselves

                // left
                for (let i = x - 1; i >= 0; i--) {
                    if (board[y][i] != null) {
                        if (board[y][i].color !== piece.color)
                            allowedMoves.push({ x: i, y: y });
                        break;
                    }
                    allowedMoves.push({ x: i, y: y });
                }

                // right
                for (let i = x + 1; i < 8; i++) {
                    if (board[y][i] != null) {
                        // if we hit a piece, we can't move any further either way, but first check if it's our own piece
                        if (board[y][i].color !== piece.color)
                            allowedMoves.push({ x: i, y: y });
                        break;
                    }

                    // here we can safely say it's an empty square, so we can add it to the allowed moves
                    allowedMoves.push({ x: i, y: y });
                }

                // up
                for (let i = y + 1; i < 8; i++) {
                    if (board[i][x] != null) {
                        if (board[i][x].color !== piece.color)
                            allowedMoves.push({ x: x, y: i });
                        break;
                    }
                    allowedMoves.push({ x: x, y: i });
                }

                // down
                for (let i = y - 1; i >= 0; i--) {
                    if (board[i][x] != null) {
                        if (board[i][x].color !== piece.color)
                            allowedMoves.push({ x: x, y: i });
                        break;
                    }
                    allowedMoves.push({ x: x, y: i });
                }

                return allowedMoves;

            case PieceType.Bishop:
                // a bishop is basically rook but in diagonals

                // left up
                for (let i = 1; i <= x; i++) {
                    const pos = [y - i, x - i];
                    if (pos[0] < 0 || pos[0] > 7 || pos[1] < 0 || pos[1] > 7)
                        break;

                    if (board[pos[0]][pos[1]] != null) {
                        if (board[pos[0]][pos[1]].color !== piece.color)
                            allowedMoves.push({ x: pos[1], y: pos[0] });
                        break;
                    }
                    allowedMoves.push({ x: pos[1], y: pos[0] });
                }

                // right up
                for (let i = 1; i < 8; i++) {
                    const pos = [y - i, x + i];
                    if (pos[0] < 0 || pos[0] > 7 || pos[1] < 0 || pos[1] > 7)
                        break;

                    if (board[pos[0]][pos[1]] != null) {
                        if (board[pos[0]][pos[1]].color !== piece.color)
                            allowedMoves.push({ x: pos[1], y: pos[0] });
                        break;
                    }
                    allowedMoves.push({ x: pos[1], y: pos[0] });
                }

                // left down
                for (let i = 1; i < 8; i++) {
                    const pos = [y + i, x - i];
                    if (pos[0] < 0 || pos[0] > 7 || pos[1] < 0 || pos[1] > 7)
                        break;

                    if (board[pos[0]][pos[1]] != null) {
                        if (board[pos[0]][pos[1]].color !== piece.color)
                            allowedMoves.push({ x: pos[1], y: pos[0] });
                        break;
                    }
                    allowedMoves.push({ x: pos[1], y: pos[0] });
                }

                // right down
                for (let i = 1; i < 8; i++) {
                    const pos = [y + i, x + i];
                    if (pos[0] < 0 || pos[0] > 7 || pos[1] < 0 || pos[1] > 7)
                        break;

                    if (board[pos[0]][pos[1]] != null) {
                        if (board[pos[0]][pos[1]].color !== piece.color)
                            allowedMoves.push({ x: pos[1], y: pos[0] });
                        break;
                    }
                    allowedMoves.push({ x: pos[1], y: pos[0] });
                }

                return allowedMoves;

            case PieceType.King:
                // a king can move one in any direction
                // generate the possible moves
                const kingMoves = [
                    [y + 1, x],
                    [y - 1, x],
                    [y, x + 1],
                    [y, x - 1],
                    [y + 1, x + 1],
                    [y - 1, x + 1],
                    [y + 1, x - 1],
                    [y - 1, x - 1],
                ];

                for (const kingMove of kingMoves) {
                    // check if it's out of bounds
                    if (
                        kingMove[0] < 0 ||
                        kingMove[0] > 7 ||
                        kingMove[1] < 0 ||
                        kingMove[1] > 7
                    )
                        continue;

                    // check if we're trying to hit our own piece
                    if (board[kingMove[0]][kingMove[1]]?.color === piece.color)
                        continue;

                    allowedMoves.push({ x: kingMove[1], y: kingMove[0] });
                }

                // check if we can castle
                if (!piece.hasMoved) {
                    // check if we can castle left
                    if (
                        board[y][0].type === PieceType.Rook &&
                        !board[y][0].hasMoved &&
                        board[y][1] == null &&
                        board[y][2] == null &&
                        board[y][3] == null
                    )
                        allowedMoves.push({ x: 2, y: y });

                    // check if we can castle right
                    if (
                        board[y][7].type === PieceType.Rook &&
                        !board[y][7].hasMoved &&
                        board[y][6] == null &&
                        board[y][5] == null
                    )
                        allowedMoves.push({ x: 6, y: y });
                }

                return allowedMoves;

            case PieceType.Queen:
                // a queen is rook and bishop combined

                // generate the 8 direction
                const queenMoves = [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1],
                    [1, 1],
                    [-1, 1],
                    [1, -1],
                    [-1, -1],
                ];


                const performQueenMove = (pos: number[]) => {
                    for (
                        // we offset x and y each iteration based on pos
                        let y2 = y + pos[0], x2 = x + pos[1];
                        y2 >= 0 && y2 <= 7 && x2 >= 0 && x2 <= 7;
                        y2 += pos[0], x2 += pos[1]
                    ) {
                        if (board[y2][x2] != null) {
                            if (board[y2][x2].color !== piece.color)
                                allowedMoves.push({ x: x2, y: y2 });
                            return;
                        }
                        allowedMoves.push({ x: x2, y: y2 });
                    }
                };

                for (const queenMove of queenMoves) {
                    performQueenMove(queenMove);
                }

                return allowedMoves;
        }

        return allowedMoves;
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

enum PieceType {
    Rook = 1,
    Knight = 2,
    Bishop = 3,
    Pawn = 4,
    Queen = 5,
    King = 6,
};

interface ChessMove {
    x: number,
    y: number
}

class Piece {
    /**
     * @type {number} The color of the piece. 1 = white, 2 = black
     */
    color: number;
    /**
     * @type {number} The type of the piece. 1 = bishop, 2 = knight, 3 = rook, 4 = pawn, 5 = queen, 6 = king
     */
    type: number;
    /**
     * If this piece has moved yet.
     */
    hasMoved: boolean;

    /**
     *
     * @param color The color of the piece.
     * @param type The type of the piece.
     */
    constructor(color: "White" | "Black", type: PieceType) {
        this.color = color === "White" ? 1 : 2;
        this.type = type;
        this.hasMoved = false;
    }
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