import { Message } from "discord.js";
import { ReverseLeetSpeak, StripString } from "../MessageUtils.js";
import { PunishMessage } from "../Reishi.js";
import blacklist from "./blacklist.js";

/**
 * The main function for profanity checking.
 * @param message The message to check.
 * @returns True if the message contains profanity.
 */
export default function (message: Message<true>) {
    const found = DetectProfanity(message.content);
    if (found) {
        PunishMessage(message, "BlacklistedWord", { comment: found });
        return true;
    }
    return false;
}

/**
 * The internal function that detects profanity.
 */
export function DetectProfanity(string: string) {
    // remove characters like - _ and so on and split the string into words
    const words = StripString(string);

    const backCheck = new Array<string>();

    // loop through every word
    for (const word of words) {
        // push the element to back_check, if the word is not long
        if (word.length <= 4) {
            backCheck.push(word);
        }

        // if back_check has more than 5 words, shift it
        if (backCheck.length > 5) {
            backCheck.shift();
        }

        // check for exact word (without leet speak reverse)
        let wordResult = CheckWord(word);
        if (wordResult) {
            return wordResult;
        }

        // reverse the word from leet speak, then check if we have a match
        wordResult = CheckWord(ReverseLeetSpeak(word));
        if (wordResult) {
            return wordResult;
        }

        // for back_check we don't want to check everything at once, but in descending groups
        wordResult = CheckBack(backCheck);
        if (wordResult) {
            return wordResult;
        }
    }

    return null;
}

function CheckBack(backCheck: Array<string>) {
    let wordResult: string | null = "";
    for (let j = 0; j < backCheck.length; j++) {
        wordResult = CheckWord(backCheck.slice(j).join(""));
        if (wordResult) {
            return wordResult;
        }
    }
    return null;
}

/**
 * @param word The word to check.
 * @returns The word that was in the blacklist (if none, it's null).
 */
function CheckWord(word: string) {
    // check if the word is in the blacklist
    // if it is, return the word, otherwise return null
    return blacklist.words.includes(word) ? word : null;
}
