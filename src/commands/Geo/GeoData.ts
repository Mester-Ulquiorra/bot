import testMode from "../../testMode.js";

export type ExploreEvent = "geo" | "nothing" | "npc" | "enemy" | "relic" | "artifact";
export type GeoEvent = "small" | "medium" | "large" | "huge" | "kinglike";

type ItemsWithWeight<T extends ExploreEvent | GeoEvent> = Array<[T, number]>;

const GeoIcon = testMode ? "<:Geo:1078043983177072640>" : "<:Geo:1078044252765950072>";

export function extractWeights<T extends ExploreEvent | GeoEvent>(items: ItemsWithWeight<T>) {
    // extract both the names and weights from the array
    const names = items.map(([name]) => name);
    const weights = items.map(([, weight]) => weight);
    return { names, weights };
}

export default {
    GeoVersion: "0.0.1-alpha",
    GeoIcon,
    Explore: {
        /**
         * The time each player has to wait before they can explore again (in milliseconds)
         * @default 1 minute
         */
        Cooldown: 60000,
        /**
         * Name of events that can occur when exploring
         */
        Events: [["geo", 40], ["nothing", 25], ["npc", 15], ["enemy", 15.5], ["relic", 5], ["artifact", 0.5]] as ItemsWithWeight<ExploreEvent>,
        /**
         * The different amounts of Geo that can be found when exploring
         * small = 1-10
         * medium = 15-30
         * large = 50-90
         * huge = 100-200
         * kinglike = 200-500
         */
        GeoAmountEvents: [["small", 50], ["medium", 35], ["large", 10], ["huge", 4.5], ["kinglike", 0.5]] as ItemsWithWeight<GeoEvent>,
        GeoPreSentences: [
            `After carefully cutting down some vines and pushing some rocks out of the way, you stumble upon _ ${GeoIcon}!`,
            `As you explore the winding caverns, you spot a glimmering object hidden in the shadows. Upon closer inspection, you discover _ ${GeoIcon}!`,
            `You carefully navigate the treacherous terrain, avoiding spikes and pitfalls at every turn. Your efforts are rewarded when you find _ ${GeoIcon} nestled in a nearby alcove.`,
            `After defeating a fierce enemy and looting their corpse, you discover _ ${GeoIcon} among their possessions.`,
            `As you wander through the ancient ruins, you notice a strange glow emanating from a nearby chamber. Investigating further, you uncover _ ${GeoIcon} hidden away in a secret compartment.`,
            `You hack through dense undergrowth and battle swarms of vicious insects as you trek deeper into the forest. Eventually, you come across a hidden clearing containing _ ${GeoIcon}.`
        ]
    }
};