import { GuildMember, RoleResolvable } from "discord.js";

type RoleResult<T extends string> = T extends "Add" ? Promise<GuildMember> : T extends "Remove" ? Promise<GuildMember> : T extends "Check" ? boolean : never;

/**
 * A function to manage roles.
 * @param member The member to manage roles for.
 * @param role The role to manage.
 * @param mode How the role should be managed. (Add, Remove, Check) [Default: Check]
 * @param reason The reason for the role change. (Optional)
 */
export default async function (
    member: GuildMember,
    role: RoleResolvable,
    mode: "Add" | "Remove" | "Check" = "Check",
    reason = ""
): Promise<RoleResult<typeof mode>> {
    const roleID = typeof role === "string" ? role : role.id;
    switch (mode) {
        case "Add":
            return member.roles.add(roleID, reason);
        case "Remove":
            return member.roles.remove(roleID, reason);
        case "Check":
            return member.roles.cache.has(roleID);
    }
}