import { GuildMember, User } from "discord.js";
import GeoConfig, { DBGeo } from "../../database/GeoConfig.js";
import { GeoItems, GeoMultipler, IGeoItems, ItemsWithWeight, WeightedItems } from "./GeoData.js";

export async function GetGeoConfig(userId: string) {
	let geoConfig = await GeoConfig.findOne({ userId });
	if (!geoConfig) geoConfig = await GeoConfig.create({ userId });
	return geoConfig;
}

export function extractWeights<T extends WeightedItems>(items: ItemsWithWeight<T>, multipliers: GeoMultipler = null): [T[], number[]] {
	// check if there is a multiplier for explore events
	if (multipliers?.exploreEvents) {
		items = items.map(([name, weight]) => {
			const multiplier = multipliers.exploreEvents.find(([multiplierName]) => multiplierName === name);
			if (multiplier) return [name, weight * multiplier[1]];
			return [name, weight];
		});
	}

	// extract both the names and weights from the array
	const names = items.map(([name]) => name);
	const weights = items.map(([, weight]) => weight);

	return [names, weights];
}

export async function GetMultipliers(member: GuildMember | User, geoConfig: DBGeo) {
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
