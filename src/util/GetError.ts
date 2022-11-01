type ErrorType = "Default" | "Permission" | "Database" | "BadUser" | "Duration" | "Value" | "MemberUnavailable" | "InsufficentModLevel";

export default function(error: ErrorType = "Default", info: string = "[unknown]") {
	switch(error) {
		case "Default": return "Something has went wrong, please try again. If this keeps happening, open a ticket.";
		case "Permission": return "You aren't allowed to perform this action.";
		case "Database": return "Database error, please try again. If this keeps happening, open a ticket.";
		case "BadUser": return "You aren't allowed to perform this action on this user.";
		case "Duration": return "Incorrect duration formatting.";
		case "Value": return `Incorrect value for the following option: ${info}`;
		case "MemberUnavailable": return "The member has left the server.";
		case "InsufficentModLevel": return "You do not have permissions for the command with those parameters."
	}
}