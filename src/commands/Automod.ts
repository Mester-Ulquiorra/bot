import SlashCommand from "../types/SlashCommand.js";
import CreateEmbed from "../util/CreateEmbed.js";
import { AskForReason, ProcessRawRequest } from "../util/Reishi/CheckInsult.js";

const AutomodCommand: SlashCommand = {
    name: "automod",
    async runButton(interaction, client) {
        await interaction.deferReply();
        const responseID = /automod\.reason-(\d+)/.exec(interaction.customId)?.[1];
        const reason = await AskForReason(responseID);

        if (!reason) {
            interaction.editReply({ content: "Reason not available or you've already requested one" });
            return;
        }

        const request = ProcessRawRequest(reason.request);

        const embed = CreateEmbed(`**Reason for the automod evaluation**`)
            .addFields(
                { name: "Request to automod", value: request },
                { name: "Reason for punishment (from AI)", value: reason.reason }
            );

        interaction.editReply({ embeds: [embed] });
    }
};

export default AutomodCommand;