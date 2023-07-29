import { Chance } from "chance";

/**
 * A function for calculating the maximum pages available for a given amount of elements.
 */
export function CalculateMaxPage(totalCount: number, pageSize: number) {
	return Math.ceil(Math.max(totalCount, 1) / pageSize);
}

/**
 * Utility function for clamping a number between two thresholds.
 * @param number The number to clamp.
 * @param min The minimum number.
 * @param max The maximum number.
 * @returns The clamped number.
 */
export function ClampNumber(number: number, min: number, max: number) {
	return Math.min(Math.max(number, min), max);
}

export function RandomIntWithLinearlyDecreasingChance(min: number, max: number, lowestChance = 0.2) {
	const chance = new Chance();

	const k = (1 - lowestChance) / (min - max);
	const d = 1 - k * min;

	const arr = Array.from({ length: max - min + 1 }, (_, i) => i + min);

	const result = chance.weighted(
		arr,
		arr.map((n) => n * k + d)
	);

	return result;
}

/**
 * Utility function for rounding a number to a given precision.
 * @param number The number to round
 * @param precision The precision to round to
 * @returns The rounded number
 */
export function RoundNumber(number: number, precision = 2) {
	// use an ugly toFixed hack to round the number
	return Number(number.toFixed(precision));
}
