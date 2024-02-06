import mongoose from "mongoose";
import { join } from "path";
import { fileURLToPath } from "url";
import { logger } from "./bootstrap.js";
import config from "./config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

logger.log("Connecting to database...", "info");
mongoose.set("setDefaultsOnInsert", true);
mongoose
    .connect(`mongodb://${config.DANGER.DB_URL}`, {
        authSource: "$external",
        authMechanism: "MONGODB-X509",
        tls: true,
        tlsCertificateKeyFile: join(__dirname, "..", config.DANGER.DB_KEY),
        retryWrites: true,
        writeConcern: {
            w: "majority"
        },
        dbName: config.DANGER.DB_NAME
    })
    .then(() => {
        // hurray, the bot is ready
        logger.log("Database connection established", "info");
        import("./Ulquiorra.js");
    })
    .catch((err) => {
        logger.log("An error has happened while trying to connect to the database, which is a fatal issue. Terminating...", "fatal");
        logger.log(err, "fatal");
        process.exit(1);
    });
