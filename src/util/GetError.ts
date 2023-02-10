type ErrorType = "Default" | "Permission" | "Database" | "BadUser" | "Duration" | "BadValue" | "MemberUnavailable" | "InsufficentModLevel";

export default function (error: ErrorType = "Default", info = "[unknown]") {
    switch (error) {
        case "Default": return "Something has went wrong, please try again. If this keeps happening, open a ticket.";
        case "Permission": return "You are not allowed to perform this action.";
        case "Database": return "Database error, please try again. If this keeps happening, open a ticket.";
        case "BadUser": return "You are not allowed to perform this action on this user.";
        case "Duration": return "Incorrect duration formatting.";
        case "BadValue": return `Incorrect value for the following option: ${info}`;
        case "MemberUnavailable": return "The member has left the server.";
        case "InsufficentModLevel": return "Your mod level is not allowed to run that command / use those parameters.";
    }
}