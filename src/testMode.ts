import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath, URL } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default existsSync(join(__dirname, "..", ".test"));