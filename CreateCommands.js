import { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

/**
 * @type SlashCommandBuilder[]
 */
const commands = [];

commands.push(
    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a member")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("The member to unban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("The reason of the unban")
                .setRequired(false)
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the server's rank leaderboard")
        .addIntegerOption(option =>
            option
                .setName("page")
                .setDescription("The page to view")
                .setMinValue(1)
                .setRequired(false)
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Show your or another member's rank")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("The member whose rank you want to see")
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName("textmode")
                .setDescription("Enable this to get the rank as a text instead of an image")
                .setRequired(false)
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("xp")
        .setDescription("Manage someone's rank")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add xp/level to someone")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to manage")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("value")
                        .setDescription("The value for the command (put an \"L\" at the end to mark it as a level)")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Set someone's xp/level")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to manage")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("value")
                        .setDescription("The value for the command (put an \"L\" at the end to mark it as a level)")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove xp/level from someone")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to manage")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("value")
                        .setDescription("The value for the command (put an \"L\" at the end to mark it as a level)")
                        .setRequired(true)
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("The command for interacting with giveaways")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Start a giveaway")
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("The name of the giveaway (basically what you're giving away)")
                        .setRequired(true)
                        .setMaxLength(200)
                )
                .addStringOption(option =>
                    option
                        .setName("duration")
                        .setDescription("The duration of the giveaway (accepts duration formatting)")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("winners")
                        .setDescription("The count of winners of this giveaway (default is 1)")
                        .setMinValue(1)
                        .setMaxValue(40)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("end")
                .setDescription("End a giveaway")
                .addStringOption(option =>
                    option
                        .setName("giveaway")
                        .setDescription("The ID of the giveaway you want to end")
                        .setRequired(true)
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("info")
        .setDescription(
            "View information about members, punishments"
        )
        .addSubcommandGroup((subcommandgroup) =>
            subcommandgroup
                .setName("punishment")
                .setDescription(
                    "View information about a punishment or list a member's punishments"
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("id")
                        .setDescription(
                            "View a single punishment based on punishment id"
                        )
                        .addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription("The id of the punishment")
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("member")
                        .setDescription("List a member's punishments")
                        .addUserOption((option) =>
                            option
                                .setName("member")
                                .setDescription("The member to list the punishments of")
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("page")
                                .setDescription("The page to view")
                                .setRequired(false)
                                .setMinValue(1)
                        )
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("member")
                .setDescription("View information about a member")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member you want to view information about")
                        .setRequired(true)
                )
        )
);

commands.push(
    new ContextMenuCommandBuilder()
        .setName("Show punishment ID")
        .setType(ApplicationCommandType.Message)
);

commands.push(
    new ContextMenuCommandBuilder()
        .setName("Translate message")
        .setType(ApplicationCommandType.Message)
);

commands.push(
    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Bulk delete a count of messages (optionally from a set user)")
        .addIntegerOption(option =>
            option
                .setName("count")
                .setDescription("Count of messages to delete")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50)
        )
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("Member to delete messages from")
                .setRequired(false)
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("uno")
        .setDescription("Play a fun game of UNO!")
);

commands.push(
    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Apply a custom slowmode to the current channel")
        .addStringOption(option =>
            option
                .setName("slowmode")
                .setDescription("The slowmode you want for this channnel (accepts duration formatting)")
                .setRequired(true)
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("music")
        .setDescription("A music command, because music makes the world go around")
        .addSubcommand(subcommand =>
            subcommand
                .setName("play")
                .setDescription("Add a song to the queue (accepts youtube video and playlist links)")
                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription("The link to the song")
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("shuffle")
                        .setDescription("(Only works with playlists) if the playlist's order should be randomized")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("skip")
                .setDescription("Skip to the next song in the queue")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription("Stop the music completely (this will also make the bot leave the channel)")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("loop")
                .setDescription("Change how the songs should loop")
                .addStringOption(option =>
                    option
                        .setName("looptype")
                        .setDescription("How should the songs loop")
                        .setChoices(
                            {
                                name: "Repeat all",
                                value: "LOOP_ALL"
                            },
                            {
                                name: "Repeat one",
                                value: "LOOP_ONE"
                            },
                            {
                                name: "Don't repeat",
                                value: "NO_LOOP"
                            }
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("queue")
                .setDescription("Show the queue")
                .addIntegerOption(option =>
                    option
                        .setName("page")
                        .setDescription("The page to view")
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a song from the queue")
                .addIntegerOption(option =>
                    option
                        .setName("song")
                        .setDescription("Which song you want to delete")
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("pause")
                .setDescription("Pause the currently playing song")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("continue")
                .setDescription("Continue the currently playing song")
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("trivia")
        .setDescription("A trivia game")
        .setDescriptionLocalizations({ de: "Ein Trivia Spiel" })
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription("Play a game of Trivia")
                .setDescriptionLocalizations({ de: "Ein Trivia Spiel spielen" })
                .addStringOption((option) =>
                    option
                        .setName("category")
                        .setChoices(
                            { value: "9", name: "General Knowledge" },
                            { value: "10", name: "Entertainment: Books" },
                            { value: "11", name: "Entertainment: Film" },
                            { value: "12", name: "Entertainment: Music" },
                            {
                                value: "13",
                                name: "Entertainment: Musicals & Theatres",
                            },
                            {
                                value: "14",
                                name: "Entertainment: Television",
                            },
                            {
                                value: "15",
                                name: "Entertainment: Video Games",
                            },
                            {
                                value: "16",
                                name: "Entertainment: Board Games",
                            },
                            { value: "17", name: "Science & Nature" },
                            { value: "18", name: "Science: Computers" },
                            { value: "19", name: "Science: Mathematics" },
                            { value: "20", name: "Mythology" },
                            { value: "21", name: "Sports" },
                            { value: "22", name: "Geography" },
                            { value: "23", name: "History" },
                            { value: "24", name: "Politics" },
                            { value: "25", name: "Art" },
                            { value: "26", name: "Celebrities" },
                            { value: "27", name: "Animals" },
                            { value: "28", name: "Vehicles" },
                            { value: "29", name: "Entertainment: Comics" },
                            { value: "30", name: "Science: Gadgets" },
                            {
                                value: "31",
                                name: "Entertainment: Japanese Anime & Manga",
                            },
                            {
                                value: "32",
                                name: "Entertainment: Cartoon & Animations",
                            }
                        )
                        .setDescription("The category of the questions (if you don't choose one it will be random for each question)")
                        .setRequired(false)
                )
                .addStringOption((option) =>
                    option
                        .setName("difficulty")
                        .setDescription(
                            "The difficulty of the questions (default: medium)"
                        )
                        .setChoices(
                            { name: "Easy", value: "easy" },
                            { name: "Medium", value: "medium" },
                            { name: "Hard", value: "hard" },
                            {
                                name: "Mixed (the questions' difficulty will be randomized)",
                                value: "mixed",
                            }
                        )
                        .setRequired(false)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("rounds")
                        .setDescription(
                            "How many questions you want to answer (default is 5)"
                        )
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("chess")
        .setDescription("A chess game, very serious")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription("Start a new game with someone")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member you want to play with.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("cancel")
                .setDescription(
                    "Cancel your game (this will automatically make your opponent win)"
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("tictactoe")
        .setDescription("A tictactoe game :D")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("play")
                .setDescription("Start a new game with someone")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member you want to play with.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("cancel")
                .setDescription(
                    "Cancel your game (this will automatically make your opponent win)"
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("View your stats or someone else's stats")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription("The member to view the stats of")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("leaderboard")
                .setDescription("View the stat leaderboard")
                .addIntegerOption((option) =>
                    option
                        .setName("page")
                        .setDescription(
                            "The page of the leaderboard to view"
                        )
                        .setMinValue(1)
                        .setRequired(false)
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock a channel with a set reason.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("unlock")
                .setDescription("Unlock the current channel.")
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription(
                            "An optional reason. (if you start it with a *, all channels will be unlocked)"
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("channel")
                .setDescription("Lock the current channel.")
                .addStringOption((option) =>
                    option
                        .setName("reason")
                        .setDescription(
                            "An optional reason. (if you start it with a *, all channels will be locked)"
                        )
                        .setRequired(false)
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("info")
        .setDescription(
            "Get information about member, punishments, all that good stuff :)"
        )
        .addSubcommandGroup((subcommandgroup) =>
            subcommandgroup
                .setName("punishment")
                .setDescription(
                    "View information about a punishment or list a member's punishments"
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("id")
                        .setDescription(
                            "View a single punishment based on punishment id"
                        )
                        .addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription("The id of the punishment")
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("member")
                        .setDescription("List a member's punishments")
                        .addStringOption((option) =>
                            option
                                .setName("id")
                                .setDescription(
                                    "The id of the member to list the punishments of."
                                )
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("page")
                                .setDescription("The page to view")
                                .setRequired(false)
                                .setMinValue(1)
                        )
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("member")
                .setDescription("View information about a member")
                .addUserOption((option) =>
                    option
                        .setName("member")
                        .setDescription(
                            "The member to view information of (they must be in the server)"
                        )
                        .setRequired(true)
                )
        )
);

commands.push(
    new SlashCommandBuilder()
        .setName("setmod")
        .setDescription("Set a member's mod level")
        .addUserOption((option) =>
            option
                .setName("member")
                .setDescription("The member to set the mod level of")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("modlevel")
                .setDescription("The new mod level for the selected member")
                .setMinValue(-1)
                .setMaxValue(6)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("An optinal reason")
                .setRequired(false)
        )
);

commands.forEach(command => command.toJSON());
for (const command of commands) {
    console.log(JSON.stringify(command) + "\n");
}