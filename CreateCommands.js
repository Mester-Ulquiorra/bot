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

commands.forEach(command => command.toJSON());
for (const command of commands) {
    console.log(JSON.stringify(command));
}