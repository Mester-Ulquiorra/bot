import Mongoose from "mongoose";
import { join } from "path";
import { fileURLToPath } from "url";
import config from "./config.js";
import Log, { LogType } from "./util/Log.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

Mongoose.set("strictQuery", false);
Mongoose.connect(`mongodb+srv://${config.DANGER.DB_URL}/${config.DANGER.DB_NAME}`, {
    authMechanism: "MONGODB-X509",
    sslCert: join(__dirname, "..", config.DANGER.DB_KEY),
    sslKey: join(__dirname, "..", config.DANGER.DB_KEY),
    retryWrites: true,
    w: "majority"
}).catch((err) => {
    Log("An error has happened while trying to connect to the database, which is a fatal issue. Terminating...", LogType.Fatal);
    Log(err, LogType.Fatal);
    process.exit();
});