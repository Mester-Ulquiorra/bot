import GeoConfig from "../../database/GeoConfig.js";

export async function GetGeoConfig(userId: string) {
    let geoConfig = await GeoConfig.findOne({ userId });
    if (!geoConfig) geoConfig = await GeoConfig.create({ userId });
    return geoConfig;
}