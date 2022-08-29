/**
 * A function for reversing leet speak in a string.
 * !1 - i, 4 - a, 3 - e, $5 - s, 0 - o, + - t, # - h
 * @param string The string to reverse.
 * @returns The reversed string.
 */
export const ReverseLeetSpeak = function(string: string): string {
    // this is going to try to reverse leet speak as good as it can
    return string
        .replaceAll(/[1!]+/g, "i")
        .replaceAll(/4+/g, "a")
        .replaceAll(/3+/g, "e")
        .replaceAll(/[$5]+/g, "s")
        .replaceAll(/#+/g, "h")
        .replaceAll(/\++/g, "t")
        .replaceAll(/0+/g, "o");
};

/**
 * A function for escaping regexp characters in a string.
 * @param text The text to escape.
 * @returns The escaped text.
 */
export const EscapeRegEXP = function(text: string): string {
    return text.replaceAll(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
