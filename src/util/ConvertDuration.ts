import config from "../config";

const DURATION_REGEX = /([1-9]\d{0,2})(s|mo|m|hr?|d|yr?)/g;

/**
 * A function used to convert a string duration (like 2h) to seconds using the ms library.
 * @param stringDuration The duration string.
 * @returns The duration in seconds. Returns NaN if the format is incorrect
 */
export default function ConvertDuration(stringDuration: string): number {
    // if string_duration is null or empty, return -1
    if (stringDuration == null || stringDuration == "") 
        return -1;

    let duration = 0;

    // find every regex match on the string
    const matches = stringDuration.matchAll(DURATION_REGEX);
    DURATION_REGEX.lastIndex = 0;

    for(const match of matches) {
        const number = Number.parseInt(match[1]);
        const type = match[2];

        switch(type) {
            case "s":
                duration += number;
                break;
            case "mo":
                duration += number * 60 * 60 * 24 * 30;
                break;
            case "m":
                duration += number * 60;
                break;
            case "h":
            case "hr":
                duration += number * 60 * 60;
                break;
            case "d":
                duration += number * 60 * 60 * 24;
                break;
            case "y":
            case "yr":
                duration += number * 60 * 60 * 24 * 365;
                break;
        }
    }

    if(duration === 0) return NaN;
    else return Math.min(duration, config.MaxDuration);
}