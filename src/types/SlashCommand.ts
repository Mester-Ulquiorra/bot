import { ButtonInteraction, ChatInputCommandInteraction, Client, MessageContextMenuCommandInteraction, ModalSubmitInteraction, StringSelectMenuInteraction, UserContextMenuCommandInteraction } from "discord.js";

export type SlashCommandReturnValue = Promise<Error | string | void>;

interface SlashCommand {
    /**
     * The name of the command.
     */
    name: string,
    /**
     * The description of the command. (Optional)
     */
    description?: string,
    /**
     * A list of user context menu commands the command can respond to.
     */
    userContextCommandNames?: Array<string>,
    /**
     * A list of message context menu commands the command can respond to.
     */
    messageContextCommandNames?: Array<string>,

    /**
     * The main function that executes when a normal slash command is run
     */
    run?: (_interaction: ChatInputCommandInteraction, _client: Client, ..._args: Array<object>) => SlashCommandReturnValue,

    /**
     * The function that executes when a modal is submitted
     */
    runModal?: (_modal: ModalSubmitInteraction, _client: Client) => SlashCommandReturnValue,

    /**
     * The function that executes when a button is clicked
     */
    runButton?: (_interaction: ButtonInteraction, _client: Client) => SlashCommandReturnValue,

    /**
     * The function that executes when a user context command is run
     */
    runUserContextCommand?: (_interaction: UserContextMenuCommandInteraction, _client: Client) => SlashCommandReturnValue,

    /**
     * The function that executes when a message context command is run
     */
    runMessageContextCommand?: (_interaction: MessageContextMenuCommandInteraction, _client: Client) => SlashCommandReturnValue,

    /**
     * The function that executes when a select menu is clicked
     */
    runSelectMenu?: (_interaction: StringSelectMenuInteraction, _client: Client) => SlashCommandReturnValue
}

export default SlashCommand;