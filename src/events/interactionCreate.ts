import { BaseInteraction, Client, InteractionReplyOptions } from "discord.js";
import { logger } from "../Ulquiorra.js";
import langs from "../lang/events/interactionCreate.js";
import Event from "../types/Event.js";
import SlashCommand, { SlashCommandReturnValue } from "../types/SlashCommand.js";
import { GetGuild } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import Localisatior, { GetMemberLanguage, LocLanguage } from "../util/Localisatior.js";
import { commands } from "../util/Register.js";

const loc = new Localisatior(langs);
/**
 * A list of custom ids the interaction manager should ignore.
 * The array contains regex patterns.
 */
const IgnoredIds: Array<RegExp> = [
    /^tictactoe\.acceptgame/,
    /^tictactoe\.board[1-9]/,
    /^chess\..+/,
    /^verify.*/,
    /^trivia.*/,
    /^ticket\.open\.*/,
    /^steam\..+/,
    /automod\.approve/,
    /automod\.deny/,
    /chatbot\..+/,
    /geofight\..+/
];

const InteractionCreateEvent: Event = {
    name: "interactionCreate",
    async run(client: Client, interaction: BaseInteraction) {
        const member = interaction.inCachedGuild() ? interaction.member : await GetGuild().members.fetch(interaction.user.id);
        const userLang = await GetMemberLanguage(member);

        const command = getCommand(interaction, userLang);
        if (!command) {
            return;
        }

        let returnMessage: string | Error | void;

        try {
            const returnStatus = executeCommand(interaction, command, client);

            returnMessage = await returnStatus.catch((error) => {
                return error;
            });
        } catch (error) {
            // most likely the command doesn't support that "type" of command we're trying to run
            const embed = CreateEmbed(loc.get(userLang, "error.unregistered"), {
                color: "error",
                title: loc.get(userLang, "error.unregistered_short")
            });

            if (interaction.isRepliable()) {
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
            return;
        }

        // if we didn't get any form of return message, we're chilling
        if (!returnMessage) {
            return;
        }

        handleReturnMessage(returnMessage, userLang, interaction);
    }
};

function handleReturnMessage(returnMessage: string | Error, userLang: LocLanguage, interaction: BaseInteraction) {
    // oops
    if (typeof returnMessage === "string") {
        const embed = CreateEmbed(returnMessage, {
            color: "warning",
            title: loc.get(userLang, "warning.uncompleted")
        });

        const options: InteractionReplyOptions = {
            embeds: [embed],
            ephemeral: true
        };

        // we need to make sure to follow up instead of a simple reply since the command might have already sent a response
        if (!interaction.isRepliable()) {
            return;
        }
        if (interaction.deferred || interaction.replied) {
            interaction.followUp(options).catch(() => {
                return;
            });
        } else {
            interaction.reply(options).catch(() => {
                return;
            });
        }
    }

    // bigger oops
    if (returnMessage instanceof Error) {
        logger.log(returnMessage.message, "error");
        logger.log(returnMessage.stack ?? "no stack", "error");

        const embed = CreateEmbed(loc.get(userLang, "error.uncompleted", returnMessage.message), {
            title: loc.get(userLang, "error.uncompleted_short"),
            color: "error"
        });

        const options: InteractionReplyOptions = {
            embeds: [embed],
            ephemeral: true
        };

        if (!interaction.isRepliable()) {
            return;
        }
        if (interaction.deferred || interaction.replied) {
            interaction.followUp(options).catch(() => {
                return;
            });
        } else {
            interaction.reply(options).catch(() => {
                return;
            });
        }
    }
}

function isValidInteraction(interaction: BaseInteraction): boolean {
    return interaction.isCommand() || interaction.isMessageComponent() || interaction.isModalSubmit() || interaction.isAutocomplete();
}

function checkIgnoreList(interaction: BaseInteraction): boolean {
    if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) {
        return false;
    }

    for (const dontCheck of IgnoredIds) {
        if (RegExp(dontCheck).exec(interaction.customId)) {
            return true;
        }
    }

    return false;
}

function extractCommandName(interaction: BaseInteraction): string | null {
    let commandName: string | null = null;

    // try to get the command name
    // for message components like buttons, the customId is formatted like "<commandName>.<everything else>"
    if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
        commandName = interaction.commandName;
    }

    if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
        commandName = interaction.customId.split(".")[0];
    }

    for (const [name, command] of commands) {
        if (interaction.isUserContextMenuCommand() && command.userContextCommandNames?.includes(interaction.commandName)) {
            commandName = name;
        }
        if (interaction.isMessageContextMenuCommand() && command.messageContextCommandNames?.includes(interaction.commandName)) {
            commandName = name;
        }
    }

    return commandName;
}

function getCommand(interaction: BaseInteraction, userLang: LocLanguage): SlashCommand | null {
    let commandName: string | null = null;
    if (!isValidInteraction(interaction)) {
        return null;
    }

    if (checkIgnoreList(interaction)) {
        return null;
    }

    commandName = extractCommandName(interaction);

    // now we can see if such command exists
    if (!commandName || !commands.has(commandName)) {
        const embed = CreateEmbed(loc.get(userLang, "error.unloaded"), {
            color: "warning",
            title: loc.get(userLang, "error.unloaded_short")
        });

        if (interaction.isRepliable()) {
            interaction.reply({ embeds: [embed], ephemeral: true });
        }

        return null;
    }

    return commands.get(commandName) as SlashCommand;
}

function executeCommand(interaction: BaseInteraction, command: SlashCommand, client: Client) {
    let returnStatus: SlashCommandReturnValue | undefined;

    if (interaction.isChatInputCommand()) {
        returnStatus = command.run?.(interaction, client);
    }
    if (interaction.isButton()) {
        returnStatus = command.runButton?.(interaction, client);
    }
    if (interaction.isModalSubmit()) {
        returnStatus = command.runModal?.(interaction, client);
    }
    if (interaction.isStringSelectMenu()) {
        returnStatus = command.runStringSelectMenu?.(interaction, client);
    }
    if (interaction.isRoleSelectMenu()) {
        returnStatus = command.runRoleSelectMenu?.(interaction, client);
    }
    if (interaction.isMentionableSelectMenu()) {
        returnStatus = command.runMentionableSelectMenu?.(interaction, client);
    }
    if (interaction.isMessageContextMenuCommand()) {
        returnStatus = command.runMessageContextCommand?.(interaction, client);
    }
    if (interaction.isUserContextMenuCommand()) {
        returnStatus = command.runUserContextCommand?.(interaction, client);
    }
    if (interaction.isAutocomplete()) {
        returnStatus = command.runAutocomplete?.(interaction, client);
    }

    if (!returnStatus) {
        throw new Error("No valid command type found");
    }

    return returnStatus;
}

export default InteractionCreateEvent;
