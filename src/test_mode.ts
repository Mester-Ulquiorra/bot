import { existsSync } from "fs"
import { join } from "path"

console.log(join(__dirname, "..", ".test"))
export default existsSync(join(__dirname, "..", ".test"))