import { Message } from "discord.js";
import { ReverseLeetSpeak } from "../MessageUtils";

const WordLengthThreshold = 4; // how long does a word have to be to actually be checked
const WordCountThresholdPercent = 75; // how many times can a word appear before it's considered a repeated word
const WordCountThreshold = 15; // what's the absolute count of words where it's considered a repeated word
const WordCountLengthThreshold = 7; // how long does a word have to be to be checked for letter count
const LetterCountThreshold = 7; // how many times can a letter appear in a row before it's considered a repeated letter
const NewLineThreshold = 8; // the maximum allowed new lines in a message

/**
 * @returns The word that was found (if none, it's null).
 */
export default function (message: Message): string {
    // check if message contains new lines over the threshold
    if (message.content.match(/\n/g)?.length >= NewLineThreshold)
        return "too many newlines";

    // check if there's 3 new lines in a row
    if (message.content.match(/\n{3,}/g)?.length >= 1)
        return "too many newlines in a row";

    return CheckRepeatedText(message.content.replaceAll(/\n/g, ""));
};

/**
 *
 * @param string The string to check
 * @returns If the string contains repeated text.
 */
function CheckRepeatedText(string: string): string {
    // remove characters like - _ and so on + split the string into words
    const words = ReverseLeetSpeak(string.replaceAll(/[-_"'|*~]+/g, "")).split(" ");

    // create word_map
    const wordMap = new Map<string, number>();

    // go through the words
    for (const word of words) {
        // just in case, continue if the word is literally nothing
        if (word.length === 0) continue;

        // if the word is not longer than threshold, then skip
        if (word.length < WordLengthThreshold) continue;

        // check the letters
        const letter_result = CheckLetters(word);
        if (letter_result) return letter_result;

        // increase the count of the word
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
    }

    // check if there is a word that exceeds the count threshold
    for (const [key, value] of wordMap) {
        if (
            // this weird part is calculating the percentage of the word count
            (((value * 100) / words.length > WordCountThresholdPercent && words.length > 5) ||
                /*only do the percentage calculation if there are more than 5 words */
                // this part is checking if the word is repeated more than the threshold
                (key.length >= WordCountLengthThreshold && value >= WordCountThreshold)) &&
            words.length != 1
        )
            return `repeated word ${key}`;
    }
    return null;
}

/**
 * @param word The word to check
 * @returns The repeated letter (if none, it's null).
 */
function CheckLetters(word: string): string {
    // variables used to check if there are multiple letters in a row
    let lettersInRow = 0;
    let tempLetter = "";

    // go through the letters of the word and increase the letter count
    for (const letter of word) {
        // if the letter is the same as the previous letter, increase the count
        if (letter === tempLetter) lettersInRow++;
        // if the letter is different, reset the count
        else {
            lettersInRow = 0;
            tempLetter = letter;
        }

        // if the letter is repeated more than the threshold, return the letter
        if (lettersInRow >= LetterCountThreshold)
            return `repeated letter ${letter}`;
    }
    return null;
}
