import { createHash } from "crypto";
import { ChatInputCommandInteraction, Client } from "discord.js";
import SlashCommand from "../types/SlashCommand.js";
import { DeeplTranslator } from "../Ulquiorra.js";
import { GetUserConfig } from "../util/ConfigHelper.js";
import CreateEmbed from "../util/CreateEmbed.js";
import GetError from "../util/GetError.js";
import PunishmentInfoCommand from "./PunishmentInfo.js";
import UserInfoCommand from "./UserInfo.js";
import LanguageDetect from "languagedetect";
console.log(LanguageDetect);

const lngDetector = new LanguageDetect();

const TranslateCooldown = new Map<string, number>();

interface TranslationCacheObject {
    messageId: string,
    translation: string,
    checksum: string,
    language: string
}

const TranslationCache = new Array<TranslationCacheObject>();
const MaxTranslationCacheLength = 1000;

const LanguageNames = new Intl.DisplayNames(["en"], { type: "language" });

const InfoCommand: SlashCommand = {
    name: "info",
    messageContextCommandNames: [
        "Show punishment ID",
        "Show message ID",
        "Translate message"
    ],

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
            // get the cooldown
            const cooldown = TranslateCooldown.has(interaction.user.id) 
                ? TranslateCooldown.get(interaction.user.id) 
                : TranslateCooldown.set(interaction.user.id, 0).get(interaction.user.id);

            if(Date.now() - cooldown <= 2_000)
                return "Sorry, you're still in cooldown";

            TranslateCooldown.set(interaction.user.id, Date.now());

            // check for message length
            if(interaction.targetMessage.cleanContent.length > 3_000)
                return "Sorry, translation of really long messages are not allowed";

            // now check if the message is already in the cache
            const cachedTranslation = TranslationCache.find((translation) => {
                return translation.messageId === interaction.targetMessage.id;
            });
            
            cacheCheck: if(cachedTranslation) {
                // check if the checksums match
                const messageChecksum = createHash("md5").update(interaction.targetMessage.cleanContent).digest("hex");
                if(cachedTranslation.checksum !== messageChecksum) {
                    // delete it
                    TranslationCache.splice(TranslationCache.indexOf(cachedTranslation), 1);
                    break cacheCheck;
                }

                interaction.reply({ 
                    embeds: [
                        CreateEmbed(`Translated text (from cache):\n${cachedTranslation.translation}`)
                            .setFooter({ text: "Translation provided by DeepL" })
                            .addFields({ name: "Detected language:", value: cachedTranslation.language})
                    ],
                    ephemeral: true
                });
                
                return;
            }
            
            // at this point, we know it's not cached
            
            // get the language
            const messageLanguage = lngDetector.detect(interaction.targetMessage.cleanContent)?.[0]?.[0];
            
            if(messageLanguage === "english")
                return "It looks like that message is already in English";

            if(messageLanguage == null)
                return "We couldn't detect the language of the message, it's probably too short";
                
            const translation = await DeeplTranslator.translateText(interaction.targetMessage.cleanContent, null, "en-US")
                .then(result => { return result; })
                .catch(() => { return "An unexpected error has occured while trying to translate the message"});
                
            if(typeof translation === "string")
                return translation;
                
            // save it to cache
            TranslationCache.push({
                checksum: createHash("md5").update(interaction.targetMessage.cleanContent).digest("hex"),
                language: LanguageNames.of(translation.detectedSourceLang),
                messageId: interaction.targetMessage.id,
                translation: translation.text
            });

            // if we've reached the maximum length of cached messages, remove the oldest ones
            if(TranslationCache.length > MaxTranslationCacheLength) {
                TranslationCache.splice(0, TranslationCache.length - MaxTranslationCacheLength);
            }

            interaction.reply({ 
                embeds: [
                    CreateEmbed(`Translated text:\n${translation.text}`)
                        .setFooter({ text: "Translation provided by DeepL" })
                        .addFields({ name: "Detected language:", value: LanguageNames.of(translation.detectedSourceLang)})
                ],
                ephemeral: true
            });
        }
    },
}

export default InfoCommand;