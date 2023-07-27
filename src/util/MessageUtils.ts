/**
 * A function for reversing leet speak in a string.
 * Legend: 1 - i, 4 - a, 3 - e, $5 - s, 0 - o, +7 - t, # - h
 * @param string The string to reverse.
 * @returns The reversed string.
 */
export function ReverseLeetSpeak(string: string) {
	// this is going to try to reverse leet speak as good as it can
	return string
		.replaceAll(/1/g, "i")
		.replaceAll(/4/g, "a")
		.replaceAll(/3/g, "e")
		.replaceAll(/[$5]/g, "s")
		.replaceAll(/#/g, "h")
		.replaceAll(/[+7]/g, "t")
		.replaceAll(/0/g, "o");
}

/**
 * Lowercases string, removes special characters and unnecessary whitespace from a string and returns it as an array of words
 * @param string The string to strip
 */
export function StripString(string: string) {
	return string
		.toLowerCase()
		.replaceAll(/[^\p{L}\s\d$+#']/giu, "")
		.split(/\s+/)
		.filter((s) => s !== "");
}
