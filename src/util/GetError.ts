type ErrorType = "Default" | "Permission" | "Database" | "BadUser" | "Duration" | "BadValue" | "UserUnavailable" | "InsufficentModLevel";

/**
 * Get a unified error message.
 * @param {ErrorType} error The type of error
 * @param {string} info Additional information to the error
 * @returns {string} The error message
 */
export default function (error: ErrorType = "Default", info = "[unknown]") {
	switch (error) {
		case "Default":
			return "Something has went wrong, please try again. If this keeps happening, open a ticket.";
		case "Permission":
			return "You are not allowed to perform this action.";
		case "Database":
			return "Database error, please try again. If this keeps happening, open a ticket.";
		case "BadUser":
			return "You are not allowed to perform this action on this user.";
		case "Duration":
			return "Incorrect duration formatting.";
		case "BadValue":
			return `Incorrect value for the following option: ${info}`;
		case "UserUnavailable":
			return "The user is not available (either left the server or deleted account).";
		case "InsufficentModLevel":
			return "Your mod level is not allowed to run that command / use those parameters.";
	}
}
