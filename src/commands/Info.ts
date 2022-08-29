import { ChatInputCommandInteraction, Client } from "discord.js";
import SlashCommand from "../types/SlashCommand";
import { GetUserConfig } from "../util/ConfigHelper";
import GetError from "../util/GetError";
import PunishmentInfoCommand from "./PunishmentInfo";
import UserInfoCommand from "./UserInfo";


const InfoCommand: SlashCommand = {
    name: "info",

    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    async run(interaction: ChatInputCommandInteraction, client: Client) {
        // get user config
        const userConfig = await GetUserConfig(interaction.user.id);

        // check if user's mod is 0
        if (userConfig.mod === 0) return GetError("Permission");

        // check if the subcommand group is punishment
        if (interaction.options.getSubcommandGroup(false) === "punishment")
            return PunishmentInfoCommand.run(interaction, client);

        // if we don't have a subcommand group, we might have "member" as subcommand
        if (interaction.options.getSubcommand(false))
            return UserInfoCommand.run(interaction, client);
    },
}

export default InfoCommand;