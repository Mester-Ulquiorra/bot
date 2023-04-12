import { Message } from "discord.js";
import { ReishiEvaluation } from "../Reishi.js";
import LanguageDetect from "languagedetect";

const lngDetect = new LanguageDetect();

export default async function (message: Message<true>): Promise<ReishiEvaluation> {
    // only check if message is longer than 50 characters
    if (message.content.length < 50) return null;

    const lngProp = lngDetect.detect(message.content, 1);

    if (lngProp.length === 0) return null;

    // check if the first 2 language predictions are english, german or hungarian
    for (const singleLng of lngProp.slice(0, 2)) {
        if (["english", "german", "hungarian"].includes(singleLng[0]))
            return null;
    }

    const lng = lngProp[0][0];

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