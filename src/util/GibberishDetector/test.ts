import * as fs from "fs";
import gibDetect from "./gibDetect.js";

const lines = fs.readFileSync("test.txt").toString("utf8").split("\n");

for (const element of lines) {
    console.log(element, gibDetect(element));
}
