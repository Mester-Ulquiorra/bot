import * as fs from "fs";
import gib_detect from "./gibDetect.js";

const lines = fs.readFileSync("test.txt").toString("utf8").split("\n");

for (const element of lines) {
    console.log(element, gib_detect(element));
}
