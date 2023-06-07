import { logger } from "../Ulquiorra.js";
import UserConfig from "../database/UserConfig.js";
export const GetUserConfig = async (userId: string, reason: string, create = true) => {
    // try to get the user config, if it fails, create a new one
    const userConfig = await UserConfig.findOne({ userId });

    return userConfig ?? (create ? CreateUserConfig(userId, reason) : null);
};

export const CreateUserConfig = async (userId: string, reason?: string) => {
    // we assume the user config doesn't exist yet
    const userConfig = await UserConfig.create({
        userId,
        lastjoined: -1,
        firstjoined: -1
    }).catch(() => { return UserConfig.findOne({ userId }); });

    if (reason) logger.log(`Created user config for user ${userId}: ${reason}`);

    return userConfig;
};