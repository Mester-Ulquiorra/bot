import { Message } from "discord.js";
import { ReishiEvaluation } from "../Reishi.js";
import LanguageDetect from "languagedetect";

const lngDetect = new LanguageDetect();

export default async function (message: Message<true>): Promise<ReishiEvaluation> {
    const lngProp = lngDetect.detect(message.content, 1);

    if (lngProp.length === 0) return null;

    const lng = lngProp[0][0];

    // check if it's english, german or hungarian
    if (["english", "german", "hungarian"].includes(lng)) return null;

    // warn the user (but not mute)
    await message.reply({
        content: `Your message was detected as ${lng[0].toUpperCase().concat(lng.slice(1))}, please use English, German or Hungarian.`,
        allowedMentions: { repliedUser: true }
    }).then((msg) => {
        setTimeout(() => {
            msg.delete();
            message.delete();
        }, 5 * 1000);
    });

    return { comment: "__done__" };
}