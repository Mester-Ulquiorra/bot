import UserConfig from "../database/UserConfig.js";
import Log from "./Log.js";

export const GetUserConfig = async (id: string, reason?: string, create = true) => {
    // try to get the user config, if it fails, create a new one
    const userConfig = await UserConfig.findOne({ userId: id });

    return userConfig ?? (create ? CreateUserConfig(id, reason) : null);
};

export const CreateUserConfig = async (userId: string, reason = "no reason provided") => {
    // we assume the user config doesn't exist yet
    const userConfig = await UserConfig.create({
        userId,
        lastjoined: -1,
        firstjoined: -1
    }).catch(() => { return UserConfig.findOne({ userId }); });

    if (reason) Log(`Created user config for user ${userId}: ${reason}`);

    return userConfig;
};