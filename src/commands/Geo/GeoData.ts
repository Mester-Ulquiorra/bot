import { Chance } from "chance";
import testMode from "../../testMode.js";

export const GeoChance = new Chance();

export interface IGeoItem {
    name: GeoItem;
    count: number;
}

export interface GeoMultipler {
    geo: number;
    exploreEvents: ItemsWithWeight<ExploreEvent>;
}

// ------- global name types ------- //
/**
 * All explore events
 */
export const IExploreEvents = <const>["geo", "nothing", "npc", "enemy", "relic", "artifact"];
export type ExploreEvent = (typeof IExploreEvents)[number];

/**
 * All geo sizes
 */
export const IGeoEvents = <const>["small", "medium", "large", "huge", "kinglike"];
export type GeoEvent = (typeof IGeoEvents)[number];

/**
 * All relics
 */
export const IRelicItems = <const>[
    "dreamstone_shard",
    "kings_idol",
    "luminous_ore",
    "mothwing_cloak",
    "arcane_egg",
    "wanderers_journal",
    "lifeblood_core"
];
export type RelicItem = (typeof IRelicItems)[number];

/**
 * All artifacts
 */
export const IArtifactItems = <const>["void_crystal", "crystal_heart", "pale_ore", "mask_shard"];
export type ArtifactItem = (typeof IArtifactItems)[number];

/**
 * All items
 */
export const IGeoItem = [...IRelicItems, ...IArtifactItems];
export type GeoItem = (typeof IGeoItem)[number];

/**
 * Sellable items
 */
export const ISellableGeoItems = [...IRelicItems];
export type SellableGeoItem = (typeof ISellableGeoItems)[number];
// --------------------------------- //

export type WeightedItems = ExploreEvent | GeoEvent | RelicItem | ArtifactItem;
export type ItemsWithWeight<T extends WeightedItems> = Array<[T, number]>;

const GeoIcon = testMode ? "<:Geo:1078043983177072640>" : "<:Geo:1078044252765950072>";

/**
 * Names of all relics
 */
export const RelicNames: { [key in RelicItem]: string } = {
    dreamstone_shard: "Dreamstone Shard",
    kings_idol: "King's Idol",
    luminous_ore: "Luminous Ore",
    mothwing_cloak: "Mothwing Cloak",
    arcane_egg: "Arcane Egg",
    wanderers_journal: "Wanderer's Journal",
    lifeblood_core: "Lifeblood Core"
};

/**
 * Names of all artifacts
 */
export const ArtifactNames: { [key in ArtifactItem]: string } = {
    void_crystal: "Void Crystal",
    crystal_heart: "Crystal Heart",
    pale_ore: "Pale Ore",
    mask_shard: "Mask Shard"
};

/**
 * Combined names of all items
 */
export const ItemNames = Object.assign({}, RelicNames, ArtifactNames);

/**
 * Descriptions of all relics
 */
export const RelicDescriptions: { [key in RelicItem]: string } = {
    dreamstone_shard:
        "[Common] A small shard of shimmering crystal that glows with a soft light. It's said to hold fragments of the dreams of ancient beings.",
    wanderers_journal:
        "[Common] A worn and tattered journal filled with the notes and observations of a traveler. It's said to hold valuable insights into the world of Hallownest.",
    kings_idol:
        "[Uncommon] A small figurine depicting a regal figure. It's said to be a token of the Pale King's favor and is highly sought after by collectors.",
    luminous_ore:
        "[Uncommon] A rare and valuable ore that glows with a bright light. It's often used in the crafting of powerful magical artifacts.",
    mothwing_cloak: "[Rare] A tattered cloak made of delicate moth wings. It allows its wearer to dash through the air and cling to walls.",
    arcane_egg:
        "[Rare] A mysterious egg that hums with arcane energy. Its true purpose is unknown, but many believe it to be a powerful magical artifact.",
    lifeblood_core:
        "[Rare] A pulsating core that contains the essence of Lifeblood, a rare substance that can heal even the most grievous wounds."
};

/**
 * Descriptions of all artifacts
 */
export const ArtifactDescriptions: { [key in ArtifactItem]: string } = {
    void_crystal:
        "[Rare] A dark, crystalline substance that seems to absorb all light around it. Its jagged edges shimmer with an otherworldly energy.",
    mask_shard:
        "[Very rare] A small, intricately carved fragment of some ancient material. It's hard to tell what it was originally a part of, but you have a feeling that if you could find enough of these shards, you might be able to create something truly remarkable.",
    crystal_heart: "[Very rare] A pulsing crystal that glows with an inner light. It seems to resonate with the beating of your own heart.",
    pale_ore:
        "[Extremely rare] A rare, shimmering metal that seems to defy all attempts to dull or tarnish it. Its surface is smooth and unblemished."
};

/**
 * The combined descriptions of all items
 */
export const ItemDescriptions = Object.assign({}, RelicDescriptions, ArtifactDescriptions);

// ------ Prices ------ //
const rarityPrices: {
    [key in "common" | "uncommon" | "rare"]: { min: number; max: number };
} = {
    common: { min: 50, max: 100 },
    uncommon: { min: 150, max: 200 },
    rare: { min: 300, max: 350 }
};

export const RelicPrices: {
    [key in RelicItem]: { min: number; max: number };
} = {
    dreamstone_shard: rarityPrices.common,
    kings_idol: rarityPrices.uncommon,
    luminous_ore: rarityPrices.uncommon,
    mothwing_cloak: rarityPrices.rare,
    arcane_egg: rarityPrices.rare,
    wanderers_journal: rarityPrices.common,
    lifeblood_core: rarityPrices.rare
};

/**
 * Combined array of all sellable items and their prices
 */
export const ItemPrices = Object.assign({}, RelicPrices) as Record<SellableGeoItem, { min: number; max: number }>;
// -------------------- //

export default {
    GeoVersion: "0.1.0-alpha",
    GeoIcon,
    Explore: {
        /**
         * The time each player has to wait before they can explore again (in milliseconds)
         */
        Cooldown: 30_000,
        /**
         * Name of events that can occur when exploring
         */
        Events: [
            ["geo", 500],
            ["enemy", 0],
            ["npc", 200],
            ["nothing", 100],
            ["relic", 50],
            ["artifact", 1]
        ] as ItemsWithWeight<ExploreEvent>,
        /**
         * The different amounts of Geo that can be found when exploring
         * small = 1-10
         * medium = 15-30
         * large = 50-90
         * huge = 100-200
         * kinglike = 200-500
         */
        GeoAmountEvents: [
            ["small", 300],
            ["medium", 150],
            ["large", 50],
            ["huge", 15],
            ["kinglike", 1]
        ] as ItemsWithWeight<GeoEvent>,
        /**
         * Sentences that would be broadcasted when finding Geo
         */
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
         * Common = dreamstone_shard, wanderers_journal (100)
         * Uncommon = luminous_ore, kings_idol (30)
         * Rare = lifeblood_core, motwhing_cloak, arcane_egg (1)
         */
        RelicChances: [
            ["dreamstone_shard", 100],
            ["wanderers_journal", 100],
            ["luminous_ore", 30],
            ["kings_idol", 30],
            ["lifeblood_core", 1],
            ["mothwing_cloak", 1],
            ["arcane_egg", 1]
        ] as ItemsWithWeight<RelicItem>,

        /**
         * The different types of artifacts that can be found when exploring and their weights
         * Rare = void_crystal, mask_shard (200)
         * Very rare = crystal_heart (50)
         * Extremely rare = pale_ore (1)
         */
        ArtifactChances: [
            ["void_crystal", 200],
            ["mask_shard", 35],
            ["crystal_heart", 35],
            ["pale_ore", 1]
        ] as ItemsWithWeight<ArtifactItem>
    }
};
