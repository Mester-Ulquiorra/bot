/**
 * A function for calculating the maximum pages available for a given amount of elements.
 */
export function CalculateMaxPage(totalCount: number, pageSize: number) {
    return Math.floor(Math.max(totalCount - 1, 1) / pageSize) + 1;
}

/**
 * A simple utility function for clamping a number between two numbers.
 * @param number The number to clamp.
 * @param min The minimum number.
 * @param max The maximum number.
 * @returns The clamped number.
 */
export function ClampNumber(number: number, min: number, max: number) {
    return Math.min(Math.max(number, min), max);
}