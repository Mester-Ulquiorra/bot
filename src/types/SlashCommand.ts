import {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    MentionableSelectMenuInteraction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";

export type SlashCommandReturnValue = Promise<Error | string | void>;

interface SlashCommand {
    /**
     * The name of the command.
     */
    name: string;
    /**
     * The description of the command. (Optional)
     */
    description?: string;
    /**
     * A list of user context menu commands the command can respond to.
     */
    userContextCommandNames?: Array<string>;
    /**
     * A list of message context menu commands the command can respond to.
     */
    messageContextCommandNames?: Array<string>;
    /**
     * The main function that executes when a normal slash command is run
     */
    run?: (interaction: ChatInputCommandInteraction, client: Client, ...args: Array<object>) => SlashCommandReturnValue;

    /**
     * The function that executes when a modal is submitted
     */
    runModal?: (modal: ModalSubmitInteraction, client: Client) => SlashCommandReturnValue;

    /**
     * The function that executes when a button is clicked
     */
    runButton?: (interaction: ButtonInteraction, client: Client) => SlashCommandReturnValue;

    /**
     * The function that executes when a user context command is run
     */
    runUserContextCommand?: (interaction: UserContextMenuCommandInteraction, client: Client) => SlashCommandReturnValue;

    /**
     * The function that executes when a message context command is run
     */
    runMessageContextCommand?: (interaction: MessageContextMenuCommandInteraction, client: Client) => SlashCommandReturnValue;

    /**
     * The function that executes when a string select menu is clicked
     */
    runStringSelectMenu?: (interaction: StringSelectMenuInteraction, client: Client) => SlashCommandReturnValue;
    /**
     * The function that executes when a role select menu is clicked
     */
    runRoleSelectMenu?: (interaction: RoleSelectMenuInteraction, client: Client) => SlashCommandReturnValue;
    /**
     * The function that executes when a mentionable select menu is clicked
     */
    runMentionableSelectMenu?: (interaction: MentionableSelectMenuInteraction, client: Client) => SlashCommandReturnValue;
    /**
     * The function that executes when an autocomplete is run
     */
    runAutocomplete?: (interaction: AutocompleteInteraction, client: Client) => SlashCommandReturnValue;
}

export default SlashCommand;
