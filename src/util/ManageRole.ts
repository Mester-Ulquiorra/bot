import { GuildMember, Role } from "discord.js";

/**
 * A function to manage roles.
 * @param member The member to manage roles for.
 * @param role The role to manage.
 * @param mode How the role should be managed. (Add, Remove, Check) [Default: Check]
 * @param reason The reason for the role change. (Optional)
 */
export default async function(
    member: GuildMember,
    role: Role | string,
    mode: "Add" | "Remove" | "Check" = "Check",
    reason: string = ""
): Promise<void | boolean> {
    switch (mode) {
        case "Add":
            member.roles.add(role, reason);
            return;
        case "Remove":
            member.roles.remove(role, reason);
            return;
        case "Check":
            return member.roles.cache.has(
                typeof role === "string" ? role : role.id
            );
    }
};