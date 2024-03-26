import {
    InternalMessage,
    InternalMessageType,
    InternalServer,
    sendInternalMessage,
    isCreateAppealMessage,
    InternalEndpoints
} from "@mester-ulquiorra/commonlib";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { logger } from "../Ulquiorra.js";
import { createAppeal } from "../commands/Appeal.js";
import PunishmentConfig from "../database/PunishmentConfig.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const secretKey = Buffer.from(readFileSync(join(__dirname, "..", "..", "internal-secret"), "utf-8"), "hex");

/**
 * Sends an internal message to the UCP API which is accepting messages at TCP with port 5659.
 * @param message The message to send
 */
export async function sendIMessageToAPI<T extends InternalMessageType>(message: InternalMessage<T>) {
    const success = await sendInternalMessage(secretKey, message, InternalEndpoints.API);

    if (typeof success === "string") {
        logger.log(`Failed to send internal message: ${success}`, "error");
        return false;
    }

    return true;
}

const internalServer = new InternalServer(InternalEndpoints.BOT, secretKey, async (message) => {
    if (isCreateAppealMessage(message)) {
        const punishment = await PunishmentConfig.findOne({
            punishmentId: message.data.punishmentId
        });

        if (!punishment) {
            return "Punishment not found";
        }

        if (punishment.appealed) {
            return "Punishment already appealed";
        }
        punishment.appealed = true;
        await punishment.save();

        const userId = punishment.user;

        const result = await createAppeal(userId, punishment, message.data.reason, message.data.additional);
        if (!result) {
            return "Internal error";
        }
    }

    return "ok";
});

export default internalServer;
