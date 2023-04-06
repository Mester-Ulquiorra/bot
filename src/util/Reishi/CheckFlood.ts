import { Message } from "discord.js";
import { ReverseLeetSpeak, StripString } from "../MessageUtils.js";
import { ReishiEvaluation } from "../Reishi.js";

const SystemMessage = `You're FloodGPT. Your job is to evaluate a message and tell if it contains repeated text. Reply with just "no" (without any explanation or punctuation) or the part that's being repeated.
Here are the possible ways of repeated text:
- a word: "hello hello hello hello hello" (the same word 4 or more times after each other should be flagged)
- a sentence: "Welcome here. Welcome here. Welcome here. Welcome here." (the same sentence 3 or more times after each other should be flagged)
- a letter: yaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaay (the same letter 10 or more times after each other should be flagged)
- newlines: too many newlines, but short line sizes probably mean a message trying to spam by filling up the entire screen.`;

/**
 * minimum length of a word that is checked
 */
const WordLengthThreshold = 3;
/**
 * how many times can a word appear before it's considered a repeated word (in percent)
 */
const WordCountThresholdPercent = 75;
/**
 * what's the absolute count of words where it's considered a repeated word
 */
const WordCountAbsoluteThreshold = 15;
/**
 * how long does a word have to be to be checked for absolute count
 */
const WordCountAbsoluteLengthThreshold = 6;
/**
 * how many times can a letter appear in a row before it's considered a repeated letter
 */
const LetterCountThreshold = 7;
/**
 * the maximum allowed new lines in a message
 */
const NewLineThreshold = 10;

/**
 * @returns The word that was found (if none, it's null).
 */
export default function (message: Message<true>): ReishiEvaluation {
    return { comment: DetectFlood(message.content) };
}

/**
 * The internal function to detect flood
 * @param string The string to detect flood in
 * @returns The detected error or null if the string is safe
 */
export function DetectFlood(string: string) {
    // check if message contains new lines over the threshold
    if (string.match(/\n/g)?.length >= NewLineThreshold)
        return "too many newlines";

    // check if there are 4 new lines in a row
    if (string.match(/\n{4,}/g)?.length >= 1)
        return "too many newlines in a row";

    return CheckRepeatedText(string);
}

/**
 *
 * @param string The string to check
 * @returns If the string contains repeated text.
 */
function CheckRepeatedText(string: string) {
    // remove characters like - _ and so on + split the string into words
    const words = StripString(string).map(s => ReverseLeetSpeak(s));

    // create wordMap
    const wordMap = new Map<string, number>();

    // go through the words
    for (const word of words) {
        // if the word is not longer than threshold, then skip
        if (word.length < WordLengthThreshold) continue;

        // check the letters
        const letter_result = CheckLetters(word);
        if (letter_result) return letter_result;

        // increase the count of the word
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
    }

    // check if there is a word that exceeds the count threshold
    for (const [word, count] of wordMap) {
        const wordPercent = (count * 100) / words.length;

        // only do the percentage calculation if there are more than 5 words
        const overPercent = (wordPercent >= WordCountThresholdPercent && words.length > 5);
        // this part is checking if the word is repeated more than the absolute threshold
        const overAbsoluteCount = (word.length >= WordCountAbsoluteLengthThreshold && count >= WordCountAbsoluteThreshold);

        if (
            (overPercent || overAbsoluteCount) &&
            words.length != 1
        )
            return `repeated word ${word}`;
    }
    return null;
}

/**
 * @param word The word to check
 * @returns The repeated letter (if none, it's null).
 */
function CheckLetters(word: string) {
    // variables used to check if there are multiple letters in a row
    let lettersInRow = 0;
    let tempLetter = "";

    // go through the letters of the word and increase the letter count
    for (const letter of word) {
        // if the letter is the same as the previous letter, increase the count
        if (letter === tempLetter) lettersInRow++;
        // if the letter is different, reset the count
        else {
            lettersInRow = 1;
            tempLetter = letter;
        }

        // if the letter is repeated more than the threshold, return the letter
        if (lettersInRow >= LetterCountThreshold)
            return `repeated letter ${letter}`;
    }
    return null;
}
