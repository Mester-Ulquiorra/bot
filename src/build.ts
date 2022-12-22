import fse from "fs-extra";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

fse.copySync(join(__dirname, "..", "src", "util", "GibberishDetector"), join(__dirname, "util", "GibberishDetector"));
fse.copySync(join(__dirname, "..", "src", "res"), join(__dirname, "res"));