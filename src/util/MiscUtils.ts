/**
 * Simple function implementing the Fisher-Yates algorithm to shuffle arrays
 * @param array The array to shuffle
 */
export function shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

/**
 * A function for formatting durations from minutes
 * @param durationInMinutes The duration in minutes you want to format
 * @returns The formatted duration (e.g., 1 year, 2 months, 3 days, 4 hours, 5 minutes)
 */
export function formatDurationFromMinutes(durationInMinutes: number) {
    const duration = {
        minute: durationInMinutes % 60,
        hour: Math.floor(durationInMinutes / 60) % 24,
        day: Math.floor(durationInMinutes / (60 * 24)) % 30,
        month: Math.floor(durationInMinutes / (60 * 24 * 30)) % 12,
        year: Math.floor(durationInMinutes / (60 * 24 * 365))
    };

    const durationUnits = Object.entries(duration)
        .filter(([, value]) => value !== 0)
        .map(([unit, value]) => `${value} ${unit}${value > 1 ? "s" : ""}`)
        .reverse();

    return durationUnits.join(", ");
}
