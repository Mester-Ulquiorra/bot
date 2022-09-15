import { ChatInputCommandInteraction, Client } from "discord.js";
import LanguageDetect = require("languagedetect");
import SlashCommand from "../types/SlashCommand";
import { DeeplTranslator } from "../Ulquiorra";
import { GetUserConfig } from "../util/ConfigHelper";
import CreateEmbed from "../util/CreateEmbed";
import GetError from "../util/GetError";
import PunishmentInfoCommand from "./PunishmentInfo";
import UserInfoCommand from "./UserInfo"

const lngDetector = new LanguageDetect();

const TranslateCooldown = new Map<string, number>();

const InfoCommand: SlashCommand = {
    name: "info",
    messageContextCommandNames: [
        "Show punishment ID",
        "Show message ID",
        "Translate message"
    ],

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

    async runMessageContextCommand(interaction, _client) {
        if(interaction.commandName === "Show punishment ID") {
            const punishmentId = interaction.targetMessage.embeds[0]?.footer?.text.match(/Punishment ID: (\d+)/);
            if(!punishmentId || punishmentId.length === 0) return "No punishments were found";
    
            interaction.reply({ content: punishmentId[1], ephemeral: true });
        }

        if(interaction.commandName === "Show message ID") {
            const messageId = interaction.targetMessage.embeds[0]?.footer?.text.match(/Message ID: (\d+)/);
            if(!messageId || messageId.length === 0) return "No messages were found";
    
            interaction.reply({ content: messageId[1], ephemeral: true });
        }

        if(interaction.commandName === "Translate message") {
            const cooldown = TranslateCooldown.has(interaction.user.id) 
                ? TranslateCooldown.get(interaction.user.id) 
                : TranslateCooldown.set(interaction.user.id, 0).get(interaction.user.id);

            if(Date.now() - cooldown <= 5_000)
                return "Sorry, you're still in cooldown";

            TranslateCooldown.set(interaction.user.id, Date.now());

            if(lngDetector.detect(interaction.targetMessage.cleanContent)?.[0]?.[0] === "english")
                return "It looks like that message is already in English";

            const translation = await DeeplTranslator.translateText(interaction.targetMessage.cleanContent, null, "en-US")
                .then(result => { return result; })
                .catch(() => { return "An unexpected error has occured while trying to translate the next"});

            if(typeof translation === "string")
                return translation;

            interaction.reply({ 
                embeds: [
                    CreateEmbed(`Translated text:\n${translation.text}`)
                        .setFooter({ text: "Translation provided by DeepL" })
                ],
                ephemeral: true
            });
        }
    },
}

export default InfoCommand;