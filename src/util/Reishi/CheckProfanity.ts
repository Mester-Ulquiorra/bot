import { Message } from "discord.js";
import { ReverseLeetSpeak } from "../MessageUtils.js";
import blacklist from "./blacklist.js";

/**
 * The main function for profanity checking.
 * @param message The message to check.
 * @returns The word that was found (if none, it's null).
 */
export default function (message: Message): string {
    // run the function with new lines removed
    return DetectProfanity(message.content.replaceAll(/\n/g, " "));
};

/**
 * The internal function that detects profanity.
 */
export function DetectProfanity(string: string): string {
    // remove characters like - _ and so on and split the string into words
    const words = string.toLowerCase().replaceAll(/[^\p{L}\s]+/giu, "").split(" ");

    const backCheck = new Array<string>();

    // loop through every word
    for (const word of words) {
        // if the word is literally nothing, skip it (it shouldn't actually ever happen, but just in case)
        if (word.length === 0) continue;

        // push the element to back_check, if the word is not long
        if (word.length <= 4) backCheck.push(word);

        // if back_check has more than 5 words, shift it
        if (backCheck.length > 5) backCheck.shift();

        // check for exact word (without leet speak reverse)
        let wordResult: string = null;
        if (wordResult = CheckWord(word)) return wordResult;

        // reverse the word from leet speak, then check if we have a match
        if (wordResult = CheckWord(ReverseLeetSpeak(word))) return wordResult;

        // for back_check we don't want to check everything at once, but in descending groups
        for (let j = 0; j < backCheck.length; j++) {
            if (wordResult = CheckWord(backCheck.slice(j).join(""))) return wordResult;

            if (wordResult = CheckWord(ReverseLeetSpeak(backCheck.slice(j).join("")))) return wordResult;
        }
    }

    return null;
}

/**
 * @param word The word to check.
 * @returns The word that was in the blacklist (if none, it's null).
 */
function CheckWord(word: string): string {
    // check if the word is in the blacklist
    // if it is, return the word, otherwise return null
    return blacklist.words.includes(word) ? word : null;
}
