import { GuildMember, User } from "discord.js";
import GeoConfig from "../../database/GeoConfig.js";
import { DBGeo } from "../../types/Database.js";
import { GeoItems, IGeoItems } from "./GeoData.js";

export async function GetGeoConfig(userId: string) {
    let geoConfig = await GeoConfig.findOne({ userId });
    if (!geoConfig) geoConfig = await GeoConfig.create({ userId });
    return geoConfig;
}

interface GeoMultipler {
    geo: number;
}

export async function GetMultipliers(member: GuildMember | User, geoConfig: DBGeo): Promise<GeoMultipler> {
    const multipliers: GeoMultipler = {
        geo: 1
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