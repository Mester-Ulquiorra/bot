import { AuditLogEvent, GuildMember } from "discord.js";
import PunishmentConfig, { PunishmentType } from "../database/PunishmentConfig.js";
import Event from "../types/Event.js";
import Ulquiorra, { SnowFlake } from "../Ulquiorra.js";
import { GetGuild, GetSpecialChannel } from "../util/ClientUtils.js";
import CreateEmbed from "../util/CreateEmbed.js";
import Log from "../util/Log.js";
import { CreateModEmbed } from "../util/ModUtils.js";
import { DetectProfanity } from "../util/Reishi/CheckProfanity.js";

const GuildMemberUpdateEvent: Event = {
    name: "guildMemberUpdate",
    async run(_client, oldMember: GuildMember, newMember: GuildMember) {
        if (oldMember.roles.cache.size !== newMember.roles.cache.size)
            roleChange(oldMember, newMember);

        if (oldMember.nickname !== newMember.nickname)
            nicknameChange(oldMember, newMember);
    }
};

async function roleChange(oldMember: GuildMember, newMember: GuildMember) {
    // our goal is to find the change, which is surprisingly easy
    const oldRoles = oldMember.roles.cache
        .map(role => role);

    const newRoles = newMember.roles.cache
        .map(role => role);

    // this was stolen from Stackoverflow, love <3
    const difference =
        oldRoles
            .filter(role => !newRoles.includes(role))
            .concat(newRoles.filter(role => !oldRoles.includes(role)));

    const added = oldRoles.length < newRoles.length;

    const embed = CreateEmbed(`${newMember} has been ${added ? "given" : "removed from"} the ${difference[0].toString()} role`);

    GetSpecialChannel("MiscLog").send({ embeds: [embed] });
}

async function nicknameChange(oldMember: GuildMember, newMember: GuildMember) {
    const embed = CreateEmbed(`Nickname of ${newMember} has been changed`)
        .addFields(
            {
                name: "Old nickname",
                value: oldMember.nickname ?? "nothing",
                inline: true
            },
            {
                name: "New nickname",
                value: newMember.nickname ?? "nothing",
                inline: true
            }
        );

    GetSpecialChannel("MiscLog").send({ embeds: [embed] });

    if (newMember.nickname == null) return;

    if (!DetectProfanity(newMember.nickname)) return;

    const auditLogs = await GetGuild().fetchAuditLogs({
        type: AuditLogEvent.MemberUpdate,
        limit: 10
    });

    // check if a moderator has changed the nick of the person
    if (auditLogs.entries
        .find(entry => {
            if (entry.executor.id === newMember.id) return false;
            const changes = entry.changes;

            for (const change of changes) {
                if (change.key === "nick" && change.new === newMember.nickname) return true;
            }

            return false;
        })
    ) return;

    // the member has changed it
    if (!newMember.kickable) return;

    const punishmentId = SnowFlake.getUniqueID().toString();

    const punishment = await PunishmentConfig.create({
        punishmentId: punishmentId,
        user: newMember.id,
        mod: Ulquiorra.user.id,
        type: PunishmentType.Kick,
        at: Math.floor(Date.now() / 1000),
        active: false,
        automated: true,
        reason: "member has set their nickname to something inappropriate"
    });

    const modEmbed = CreateModEmbed(Ulquiorra.user, newMember.user, punishment, { detail: newMember.nickname });
    const userEmbed = CreateModEmbed(Ulquiorra.user, newMember.user, punishment, { userEmbed: true, detail: newMember.nickname });

    newMember
        .send({ embeds: [userEmbed.embed] })
        .catch(() => { return; })
        .finally(() => { newMember.kick("inappropriate nickname"); });

    Log(`${newMember.user.tag} (${newMember.id}) has been automatically kicked: ${punishment.reason}. Punishment ID: ${punishment.punishmentId}`);

    GetSpecialChannel("ModLog").send({ embeds: [modEmbed] });
}

export default GuildMemberUpdateEvent;