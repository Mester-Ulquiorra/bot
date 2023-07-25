import express, { Request, Response, NextFunction } from "express";
import yup from "yup";
import { readFileSync } from "fs";
import { join } from "path";
import { verify } from "crypto";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicKey = readFileSync(join(__dirname, "..", "..", "internal-public.pem"));

type InternalMessageType = "createAppeal" | "muteUser";
type InternalMessageData<T extends InternalMessageType> =
    T extends "createAppeal" ? { punishmentId: string, reason: string, additional: string } :
    T extends "muteUser" ? { userId: string; mod: string; reason: string; duration: number; } :
    never;

interface InternalMessage<T extends InternalMessageType> {
    type: T;
    data: InternalMessageData<T>;
}

/* Setup yup schemas */
const createAppealSchema = yup.object({
    type: yup.string().oneOf(["createAppeal"]).required(),
    data: yup.object({
        punishmentId: yup.string().required(),
        reason: yup.string().required(),
        additional: yup.string().required(),
    }).required(),
});

const muteUserSchema = yup.object({
    type: yup.string().oneOf(["muteUser"]).required(),
    data: yup.object({
        userId: yup.string().required(),
        mod: yup.string().required(),
        reason: yup.string().required(),
        duration: yup.number().required(),
    }).required(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InternalMessageSchema = yup.lazy((obj: InternalMessage<InternalMessageType>) => {
    switch(obj.type) {
        case "createAppeal": return createAppealSchema;
        case "muteUser": return muteUserSchema;
    }
});

function validateMessage<T extends InternalMessageType>(type: T, data: InternalMessageData<T>) {
    try {
        InternalMessageSchema.validateSync({ type, data });
        return true;
    } catch {
        return false;
    }
}

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

app.post("/internal", allowLocalhostOnly, (req, res) => {
    // decode the request body (it was sent as string that is signaturebase64.payloadbase64)
    const [signatureBase64, payloadBase64] = req.body.split(".");
    const signature = Buffer.from(signatureBase64, "base64");
    const payload = Buffer.from(payloadBase64, "base64");

    // verify the signature with nodejs crypto
    if (!verify("sha256", payload, publicKey, signature)) {
        res.status(401).send("Invalid signature");
        return;
    }

    // parse the payload as JSON
    const message = JSON.parse(payload.toString()) as InternalMessage<InternalMessageType>;

    console.log(payload.toString());

    // validate the message
    if (!validateMessage(message.type, message.data)) {
        res.status(400).send("Invalid message");
        return;
    }

    // handle the message
    switch (message.type) {
        case "createAppeal": {
            console.log("Creating appeal", message.data);
            break;
        }
        case "muteUser": {
            console.log("Muting user", message.data);
            break;
        }
    }
    res.sendStatus(200);
});

app.listen(5658, () => {
    console.log("Internal server started");
});