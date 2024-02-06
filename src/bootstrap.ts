import { Logger } from "@mester-ulquiorra/commonlib";
import { join } from "path";
import { fileURLToPath } from "url";

// set up everything necessary for the database and client
const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const logger = new Logger(join(__dirname, "..", "logs"));

import("./database.js");
