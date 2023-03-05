import { GuildMember } from "discord.js";
import GeoConfig from "../../database/GeoConfig.js";
import { DBGeo } from "../../types/Database.js";

export async function GetGeoConfig(userId: string) {
    let geoConfig = await GeoConfig.findOne({ userId });
    if (!geoConfig) geoConfig = await GeoConfig.create({ userId });
    return geoConfig;
}

interface GeoMultipler {
    geo: number;
}

export async function GetMultipliers(member: GuildMember, geoConfig: DBGeo): Promise<GeoMultipler> {
    const multipliers: GeoMultipler = {
        geo: 1
    };

    // add 1.5 to geo if the user is a server booster
    if (member.premiumSince != null) {
        multipliers.geo += 0.5;
    }

    return multipliers;
}