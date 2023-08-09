import {
	InternalMessage,
	InternalMessageType,
	RequestWithMessage,
	isCreateAppealMessage,
	processInternalMessage,
	sendInternalMessage as _sendInternalMessage,
} from "@mester-ulquiorra/commonlib";
import express, { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { createAppeal } from "../commands/Appeal.js";
import PunishmentConfig from "../database/PunishmentConfig.js";
import { logger } from "../Ulquiorra.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const privateKey = readFileSync(join(__dirname, "..", "..", "internal-private.pem"));
const publicKey = readFileSync(join(__dirname, "..", "..", "internal-public.pem"));

const allowLocalhostOnly = (req: Request, res: Response, next: NextFunction) => {
	const remoteAddress = req.socket.remoteAddress;
	if (remoteAddress === "::1" || remoteAddress === "127.0.0.1" || remoteAddress === "::ffff:127.0.0.1" || remoteAddress === "localhost") {
		// Request comes from localhost, allow it to continue
		next();
	} else {
		// Request comes from a different IP address, block it with a 403 Forbidden response
		res.status(403).send("Access forbidden. Only requests from localhost are allowed.");
	}
};

// start express server
const app = express();
app.use(express.text({ type: "text/plain" }));

app.post("/internal", allowLocalhostOnly, processInternalMessage(publicKey), async (req: RequestWithMessage, res) => {
	const message = req.message;

	if (!message) return res.sendStatus(500);

	// handle the message
	if (isCreateAppealMessage(message)) {
		const punishment = await PunishmentConfig.findOne({
			punishmentId: message.data.punishmentId,
		});
		const userId = punishment.user;

		const result = await createAppeal(userId, punishment, message.data.reason, message.data.additional);
		if (!result) return res.sendStatus(500);
	}

	res.sendStatus(200);
});

app.listen(5658, () => {
	logger.log("Internal server started");
});

/**
 * Sends an internal message to the UCP API which is accepting messages at /internal HTTP post with port 5659.
 * @param message The message to send
 */
export async function sendInternalMessage<T extends InternalMessageType>(message: InternalMessage<T>) {
	const success = await _sendInternalMessage(privateKey, message, "http://localhost:5659/internal");

	if (typeof success !== "string") {
		logger.log("Failed to send internal message", "error");
		return false;
	}

	if (success !== "") {
		logger.log(`Internal message failed: ${success}`, "error");
		return false;
	}

	return true;
}
