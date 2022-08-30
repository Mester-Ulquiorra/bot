import { existsSync } from "fs"
import { join } from "path"

export default existsSync(join(__dirname, "..", ".test"))