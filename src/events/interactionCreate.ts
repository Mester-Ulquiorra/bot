import { BaseInteraction, Client, InteractionReplyOptions } from "discord.js";
import Event from "../types/Event.js";
import { SlashCommandReturnValue } from "../types/SlashCommand.js";
import CreateEmbed, { EmbedColor } from "../util/CreateEmbed.js";
import Log, { LogType } from "../util/Log.js";
import { commands } from "../util/Register.js";
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
    /automod\..+/
];

const InteractionCreateEvent: Event = {
    name: "interactionCreate",
    async run(client: Client, interaction: BaseInteraction) {
        // find the command and store its return value in return_message
        let commandName = null;
        if (!interaction.isCommand() && !interaction.isMessageComponent() && !interaction.isModalSubmit() && !interaction.isAutocomplete()) return;

        if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            for (const dontCheck of IgnoredIds) {
                if (interaction.customId?.match(dontCheck))
                    return;
            }
        }

        // so here we try to get the command name
        // for message components like buttons, the customId is formatted like "<commandName>.<everything else>"
        if (interaction.isChatInputCommand() || interaction.isAutocomplete()) commandName = interaction.commandName;
        if (interaction.isMessageComponent() || interaction.isModalSubmit()) commandName = interaction.customId.split(".")[0];
        if (interaction.isCommand() && !interaction.isChatInputCommand()) {
            for (const [name, command] of commands) {
                if (interaction.isUserContextMenuCommand() && command.userContextCommandNames?.includes(interaction.commandName)) commandName = name;
                if (interaction.isMessageContextMenuCommand() && command.messageContextCommandNames?.includes(interaction.commandName)) commandName = name;
            }
        }

        // now we can see if such command exists
        if (!commands.has(commandName)) {
            const embed = CreateEmbed(`Mester has not registered the command you tried to run. What an idiot.`, {
                color: EmbedColor.Warning,
                title: "ERROR: unregistered command"
            });

            if (interaction.isRepliable()) interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const command = commands.get(commandName);

        // let the game begin
        let returnMessage: string | Error | void;

        try {
            let returnStatus: SlashCommandReturnValue;
            if (interaction.isChatInputCommand()) returnStatus = command.run(interaction, client);
            if (interaction.isButton()) returnStatus = command.runButton(interaction, client);
            if (interaction.isModalSubmit()) returnStatus = command.runModal(interaction, client);
            if (interaction.isStringSelectMenu()) returnStatus = command.runStringSelectMenu(interaction, client);
            if (interaction.isRoleSelectMenu()) returnStatus = command.runRoleSelectMenu(interaction, client);
            if (interaction.isMentionableSelectMenu()) returnStatus = command.runMentionableSelectMenu(interaction, client);
            if (interaction.isMessageContextMenuCommand()) returnStatus = command.runMessageContextCommand(interaction, client);
            if (interaction.isUserContextMenuCommand()) returnStatus = command.runUserContextCommand(interaction, client);
            if (interaction.isAutocomplete()) returnStatus = command.runAutocomplete(interaction, client);
            returnMessage = await returnStatus.then(result => { return result; }).catch((error) => { return error; });
        } catch (error) {
            // most likely the command doesn't support that "type" of command we're trying to run
            const embed = CreateEmbed(`Mester has not registered this type of interaction. What an idiot`, {
                color: EmbedColor.Error,
                title: "ERROR: unregistered interaction type"
            });

            if (interaction.isRepliable()) interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // if we didn't get any form of return message, we're chilling
        if (!returnMessage) return;

        // oops
        if (typeof returnMessage === "string") {
            const embed = CreateEmbed(returnMessage, {
                color: EmbedColor.Warning,
                title: "The command couldn't complete successfully"
            });

            const options: InteractionReplyOptions = {
                embeds: [embed],
                ephemeral: true
            };

            // we need to make sure to follow up instead of a simple reply since the command might have already sent a response
            if (!interaction.isRepliable()) return;
            if (interaction.deferred || interaction.replied) interaction.followUp(options).catch(() => { return; });
            else interaction.reply(options).catch(() => { return; });
        }

        // bigger oops
        if (returnMessage instanceof Error) {
            Log(returnMessage.stack, LogType.Error);

            const embed = CreateEmbed(`Something has gone terribly wrong, ask your Console buddy for more info.\nDetails: **${returnMessage.message}**`, {
                title: "Unexpected error",
                color: EmbedColor.Error
            });

            const options: InteractionReplyOptions = {
                embeds: [embed],
                ephemeral: true
            };

            if (!interaction.isRepliable()) return;
            if (interaction.deferred || interaction.replied) interaction.followUp(options).catch(() => { return; });
            else interaction.reply(options).catch(() => { return; });
        }
    }
};

export default InteractionCreateEvent;