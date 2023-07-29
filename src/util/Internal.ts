import { RequestWithMessage, isCreateAppealMessage, processInternalMessage } from "@mester-ulquiorra/commonlib";
import express, { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { createAppeal } from "../commands/Appeal.js";
import PunishmentConfig from "../database/PunishmentConfig.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicKey = readFileSync(join(__dirname, "..", "..", "internal-public.pem"));

const allowLocalhostOnly = (req: Request, res: Response, next: NextFunction) => {
	const remoteAddress = req.socket.remoteAddress;
	if (remoteAddress === "::1" || remoteAddress === "127.0.0.1" || remoteAddress === "::ffff:127.0.0.1") {
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
	console.log("Internal server started");
});
