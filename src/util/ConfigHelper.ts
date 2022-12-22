import UserConfig from "../database/UserConfig.js";
import Log from "./Log.js";

export const GetUserConfig = async (id: string, reason?: string, create: boolean = true) => {
    // try to get the user config, if it fails, create a new one
    const userConfig = await UserConfig.findOne({ userId: id });

    return userConfig ?? (create ? CreateUserConfig(id, reason) : null);
}

export const CreateUserConfig = async (id: string, reason: string = "no reason provided") => {
    // we assume the user config doesn't exist yet
    const userConfig = await UserConfig.create({
        userId: id,
        lastjoined: Math.floor(Date.now() / 1000),
        firstjoined: Math.floor(Date.now() / 1000)
    }).catch(() => { return UserConfig.findOne({ userId: id }) });

    if (reason) Log(`Created user config for user ${id}: ${reason}`);

    return userConfig;
}