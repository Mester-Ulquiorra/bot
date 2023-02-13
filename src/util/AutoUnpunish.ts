import { GuildMember } from "discord.js";
import config from "../config.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import UserConfig from "../database/UserConfig.js";
import Ulquiorra from "../Ulquiorra.js";
import { GetGuild, GetSpecialChannel } from "./ClientUtils.js";
import Log, { LogType } from "./Log.js";
import ManageRole from "./ManageRole.js";
import { CreateModEmbed } from "./ModUtils.js";

/**
 * A function for invalidating every punishment that is not valid anymore.
 */
export default async function () {
    // get the list of all active punishments in a oldest to newest order
    const punishments = await PunishmentConfig.find({ active: true, until: { $gt: -1, $lte: Math.floor(Date.now() / 1000) } });

    Promise.all(
        punishments.map(async (punishment) => {
            // get the user config for the user that was punished
            const userConfig = await UserConfig.findOne({
                userId: punishment.user,
            });

            // if userConfig is null, log a warning and skip
            if (userConfig == null) {
                Log(`User config for user ${punishment.user} not found, skipping punishment ${punishment.punishmentId}`, LogType.Warn);
                return;
            }

            // set punishment.active, userConfig.muted and userConfig.banned to false
            punishment.active = userConfig.muted = userConfig.banned = false;
            await punishment.save();
            await userConfig.save();

            // try to get the member from the guild (might return null if the member is not in the guild)
            const member: GuildMember = await GetGuild().members
                .fetch(punishment.user)
                .catch(() => {
                    return null;
                });

            switch (punishment.type) {
                case PunishmentType.Mute: {
                    // if the member is null, continue
                    if (member == null) break;

                    // remove the muted role
                    ManageRole(
                        member,
                        config.roles.Muted,
                        "Remove",
                        "automatic unmute"
                    );

                    // log
                    Log(`${member.user.tag} (${member.user.id}) has been automatically unmuted`);

                    // create embed
                    const userEmbed = CreateModEmbed(
                        Ulquiorra.user,
                        member.user,
                        punishment,
                        { userEmbed: true, anti: true }
                    );

                    // send embed to the user
                    member.send({ embeds: [userEmbed] }).catch(() => {
                        return null;
                    });

                    break;
                }

                case PunishmentType.Ban: {
                    // unban the member
                    GetGuild().members
                        .unban(punishment.user, "automatic unban")
                        .then((user) => {
                            // if the user is null, continue
                            if (user == null) return;

                            // log
                            Log(`${user.tag} (${user.id}) has been automatically unbanned`);
                        })
                        .catch(() => {
                            return null;
                        }); // the user is not banned, so ignore this error

                    break;
                }

                default: {
                    break;
                }
            }

            // create modembed
            const embed = CreateModEmbed(
                Ulquiorra.user,
                // if member is null, use punishment.user
                member?.user ?? punishment.user,
                punishment,
                {
                    anti: true,
                }
            );

            GetSpecialChannel("ModLog").send({ embeds: [embed] });
        })
    ).catch((error) => {
        Log(`Something has went wrong while invalidating punishments: ${error.stack}`, LogType.Warn);
    });
}