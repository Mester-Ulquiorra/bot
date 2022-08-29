import UserConfig from "../database/UserConfig"
import Log from "./Log";

export const GetUserConfig = async(id: string, reason?: string) => {
	// try to get the user config, if it fails, create a new one
	const userConfig = await UserConfig.findOne({id});

	return userConfig ?? CreateUserConfig(id, reason);
}

export const CreateUserConfig = async(id: string, reason: string = "no reason provided") => {
	// we assume the user config doesn't exist yet
	const userConfig = await UserConfig.create({
		id,
		lastjoined: Math.floor(Date.now() / 1000),
		firstjoined: Math.floor(Date.now() / 1000)
	}).catch(() => { return UserConfig.findOne({id}) });

	if(reason) Log(`Created user config for user ${id}: ${reason}`);

	return userConfig;
}