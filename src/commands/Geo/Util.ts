import { GuildMember, User } from "discord.js";
import GeoConfig, { DBGeo } from "../../database/GeoConfig.js";
import { GeoItems, GeoMultipler, IGeoItems, ItemsWithWeight, WeightedItems } from "./GeoData.js";

export async function GetGeoConfig(userId: string) {
	let geoConfig = await GeoConfig.findOne({ userId });
	if (!geoConfig) geoConfig = await GeoConfig.create({ userId });
	return geoConfig;
}

/**
 * Extract the weights from an array of items so that they can be used in the weighted function
 * @param items The items to extract the weights from
 * @param multipliers The multipliers to apply to the weights
 * @returns The names and weights of the items
 */
export function extractWeights<T extends WeightedItems>(items: ItemsWithWeight<T>, multipliers: GeoMultipler = null): [T[], number[]] {
	// extract both the names and weights from the array
	const names = new Array<T>();
	const weights = new Array<number>();

	items.map(([name, weight]) => {
		names.push(name);

		// check for multiplier
		if (multipliers?.exploreEvents) {
			const multiplier = multipliers.exploreEvents.find(([multiplierName]) => multiplierName === name);
			if (multiplier) {
				weights.push(weight * multiplier[1]);
				return;
			}
		}
		weights.push(weight);
	});

	return [names, weights];
}

export async function GetGeoMultiplier(member: GuildMember | User, geoConfig: DBGeo) {
	const multipliers: GeoMultipler = {
		geo: 1,
	};

	if (member instanceof User) return multipliers;

	// add 1.5 to geo if the user is a server booster
	if (member.premiumSince != null) {
		multipliers.geo += 0.5;
	}

	return multipliers;
}

export function IsGeoItem(item: string): item is GeoItems {
	return IGeoItems.includes(item as GeoItems);
}
