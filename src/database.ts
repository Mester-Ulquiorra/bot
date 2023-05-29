import Mongoose from "mongoose";
import { join } from "path";
import { fileURLToPath } from "url";
import { logger } from "./Ulquiorra.js";
import config from "./config.js";
const __dirname = fileURLToPath(new URL(".", import.meta.url));


Mongoose.set("strictQuery", false);
Mongoose.set("setDefaultsOnInsert", true);
Mongoose.connect(`mongodb+srv://${config.DANGER.DB_URL}/${config.DANGER.DB_NAME}`, {
    authMechanism: "MONGODB-X509",
    sslCert: join(__dirname, "..", config.DANGER.DB_KEY),
    sslKey: join(__dirname, "..", config.DANGER.DB_KEY),
    retryWrites: true,
    w: "majority"
}).catch((err) => {
    logger.log("An error has happened while trying to connect to the database, which is a fatal issue. Terminating...", "fatal");
    logger.log(err, "fatal");
    process.exit();
});