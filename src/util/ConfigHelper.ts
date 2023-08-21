import { logger } from "../Ulquiorra.js";
import UserConfig from "../database/UserConfig.js";

export const GetUserConfig = async (userId: string, reason: string) => {
	// try to get the user config, if it fails, create a new one
	const userConfig = await UserConfig.findOne({ userId });

	if (userConfig == null) return CreateUserConfig(userId, reason);
	else return userConfig;
};

export const CreateUserConfig = async (userId: string, reason?: string) => {
	if (reason) logger.log(`Created user config for user ${userId}: ${reason}`);

	const userConfig = await UserConfig.create({
		userId,
		lastjoined: -1,
		firstjoined: -1,
	});

	return userConfig;
};
