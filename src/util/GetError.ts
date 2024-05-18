type ErrorType = "Default" | "Permission" | "Database" | "BadUser" | "Duration" | "BadValue" | "UserUnavailable" | "InsufficentModLevel" | "GuildOnly";

const errorMessages: Record<ErrorType, string> = {
    Default: "Something has went wrong, please try again. If this keeps happening, open a ticket.",
    Permission: "You are not allowed to perform this action.",
    Database: "Database error, please try again. If this keeps happening, open a ticket.",
    BadUser: "You are not allowed to perform this action on this user.",
    Duration: "Incorrect duration formatting.",
    BadValue: "Incorrect value for the following option: {info}",
    UserUnavailable: "The user is not available (either left the server or deleted account).",
    InsufficentModLevel: "Your mod level is not allowed to run that command / use those parameters.",
    GuildOnly: "This command can only be used in guilds."
};

/**
 * Get a unified error message
 */
export default function (error: ErrorType = "Default", info = "[unknown]"): string {
    return errorMessages[error].replace("{info}", info);
}
