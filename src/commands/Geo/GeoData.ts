import testMode from "../../testMode.js";

export interface GeoItem {
    name: GeoItems;
    count: number;
}

export type ExploreEvent = "geo" | "nothing" | "npc" | "enemy" | "relic" | "artifact";
export type GeoEvent = "small" | "medium" | "large" | "huge" | "kinglike";
export type RelicItems = "dreamstone_shard" | "kings_idol" | "luminous_ore" | "mothwing_cloak" | "arcane_egg" | "wanderers_journal" | "lifeblood_core";

export type GeoItems = RelicItems;

type WeightedItems = ExploreEvent | GeoEvent | RelicItems;
type ItemsWithWeight<T extends WeightedItems> = Array<[T, number]>;

const GeoIcon = testMode ? "<:Geo:1078043983177072640>" : "<:Geo:1078044252765950072>";

export const RelicNames: { [key in RelicItems]: string } = {
    dreamstone_shard: "Dreamstone Shard",
    kings_idol: "King's Idol",
    luminous_ore: "Luminous Ore",
    mothwing_cloak: "Mothwing Cloak",
    arcane_egg: "Arcane Egg",
    wanderers_journal: "Wanderer's Journal",
    lifeblood_core: "Lifeblood Core"
};

export const ItemNames = Object.assign({}, RelicNames);

export const RelicDescriptions: { [key in RelicItems]: string } = {
    dreamstone_shard: "A small shard of shimmering crystal that glows with a soft light. It's said to hold fragments of the dreams of ancient beings.",
    kings_idol: "A small figurine depicting a regal figure. It's said to be a token of the Pale King's favor and is highly sought after by collectors.",
    luminous_ore: "A rare and valuable ore that glows with a bright light. It's often used in the crafting of powerful magical artifacts.",
    mothwing_cloak: "A tattered cloak made of delicate moth wings. It allows its wearer to dash through the air and cling to walls.",
    arcane_egg: "A mysterious egg that hums with arcane energy. Its true purpose is unknown, but many believe it to be a powerful magical artifact.",
    wanderers_journal: "A worn and tattered journal filled with the notes and observations of a traveler. It's said to hold valuable insights into the world of Hallownest.",
    lifeblood_core: "A pulsating core that contains the essence of Lifeblood, a rare substance that can heal even the most grievous wounds."
};

export const ItemDescriptions = Object.assign({}, RelicDescriptions);

export function extractWeights<T extends WeightedItems>(items: ItemsWithWeight<T>) {
    // extract both the names and weights from the array
    const names = items.map(([name]) => name);
    const weights = items.map(([, weight]) => weight);
    return { names, weights };
}

export default {
    GeoVersion: "0.0.2-alpha",
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
        Events: [["geo", 1000], ["nothing", 500], ["npc", 200], ["enemy", 200], ["relic", 50], ["artifact", 1]] as ItemsWithWeight<ExploreEvent>,
        /**
         * The different amounts of Geo that can be found when exploring
         * small = 1-10
         * medium = 15-30
         * large = 50-90
         * huge = 100-200
         * kinglike = 200-500
         */
        GeoAmountEvents: [["small", 500], ["medium", 200], ["large", 50], ["huge", 15], ["kinglike", 1]] as ItemsWithWeight<GeoEvent>,
        GeoPreSentences: [
            `After carefully cutting down some vines and pushing some rocks out of the way, you stumble upon _ ${GeoIcon}!`,
            `As you explore the winding caverns, you spot a glimmering object hidden in the shadows. Upon closer inspection, you discover _ ${GeoIcon}!`,
            `You carefully navigate the treacherous terrain, avoiding spikes and pitfalls at every turn. Your efforts are rewarded when you find _ ${GeoIcon} nestled in a nearby alcove.`,
            `After defeating a fierce enemy and looting their corpse, you discover _ ${GeoIcon} among their possessions.`,
            `As you wander through the ancient ruins, you notice a strange glow emanating from a nearby chamber. Investigating further, you uncover _ ${GeoIcon} hidden away in a secret compartment.`,
            `You hack through dense undergrowth and battle swarms of vicious insects as you trek deeper into the forest. Eventually, you come across a hidden clearing containing _ ${GeoIcon}.`
        ],
        /**
         * The different types of relics that can be found when exploring and their weights
         * Rare = lifeblood_core, motwhing_cloak, arcane_egg (1)
         * Uncommon = luminous_ore, kings_idol (30)
         * Common = dreamstone_shard, wanderers_journal (100)
         */
        RelicChances: [["dreamstone_shard", 100], ["wanderers_journal", 100], ["luminous_ore", 30], ["kings_idol", 30], ["lifeblood_core", 1], ["mothwing_cloak", 1], ["arcane_egg", 1]] as ItemsWithWeight<RelicItems>
    }
};