import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Check if we're running in test mode (not on production server)
 */
export default existsSync(join(__dirname, "..", ".test"));