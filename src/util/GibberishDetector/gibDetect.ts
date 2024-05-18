import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { GetResFolder } from "../../Ulquiorra.js";

const resRoot = join(GetResFolder(), "gibberish");

const acceptedChars = "abcdefghijklmnopqrstuvwxyz ";

const k = acceptedChars.length;

const pos: { [char: string]: number } = {};

for (let i = 0; i < k; i++) {
    pos[acceptedChars[i]] = i;
}

const trainFile = "big.txt";
const goodFile = "good.txt";
const badFile = "bad.txt";
const modelFile = "gib_model.json";

/**This function takes a string and converts it to lower case, and then
 * returns an array of characters that are in the string and are in
 * the accepted_chars string. Characters that are not in the accepted_chars
 * string are ignored.
 */
function normalize(line: string): string[] {
    const arr = line.toLowerCase().split("");
    return arr.filter(function (item) {
        return acceptedChars.indexOf(item) > -1;
    });
}

function train() {
    //Assume we have seen 10 of each character pair.  This acts as a kind of
    //prior or smoothing factor.  This way, if we see a character transition
    //live that we've never observed in the past, we won't assume the entire
    //string has 0 probability.
    const logProbMatrix = [];

    for (let i = 0; i < k; i++) {
        const temp = [];
        for (let j = 0; j < k; j++) {
            temp.push(10);
        }
        logProbMatrix.push(temp);
    }

    //Count transitions from big text file, taken
    //from http://norvig.com/spell-correct.html
    const lines = readFileSync(join(resRoot, trainFile)).toString("utf8").split("\n");
    //
    for (const key in lines) {
        //Return all n grams from l after normalizing
        const filteredLine = normalize(lines[key]);
        let a: boolean | string = false;
        for (const b in filteredLine) {
            if (a !== false) {
                logProbMatrix[pos[a]][pos[filteredLine[b]]] += 1;
            }
            a = filteredLine[b];
        }
    }

    //Normalize the counts so that they become log probabilities.
    //We use log probabilities rather than straight probabilities to avoid
    //numeric underflow issues with long texts.
    //This contains a justification:
    //http://squarecog.wordpress.com/2009/01/10/dealing-with-underflow-in-joint-probability-calculations/
    for (const i in logProbMatrix) {
        const s = logProbMatrix[i].reduce(function (a, b) {
            return a + b;
        });
        for (const j in logProbMatrix[i]) {
            logProbMatrix[i][j] = Math.log(logProbMatrix[i][j] / s);
        }
    }

    //Find the probability of generating a few arbitrarily choosen good and
    //bad phrases.
    const goodLines = readFileSync(join(resRoot, goodFile)).toString("utf8").split("\n");
    const goodProbs = [];
    for (const key in goodLines) {
        goodProbs.push(averageTransitionProbability(goodLines[key], logProbMatrix));
    }

    const badLines = readFileSync(join(resRoot, badFile)).toString("utf8").split("\n");
    const badProbs = new Array<number>();
    for (const key in badLines) {
        badProbs.push(averageTransitionProbability(badLines[key], logProbMatrix));
    }

    //Assert that we actually are capable of detecting the junk.
    const minGoodProbs = Math.min.apply(null, goodProbs);
    const maxBadProbs = Math.max.apply(null, badProbs);
    if (minGoodProbs <= maxBadProbs) {
        return false;
    }

    //And pick a threshold halfway between the worst good and best bad inputs.
    const threshold = (minGoodProbs + maxBadProbs) / 2;

    console.log("good", goodProbs);
    console.log("bad", badProbs);
    console.log("th", threshold);

    //save matrix
    writeFileSync(
        join(resRoot, modelFile),
        JSON.stringify({
            matrix: logProbMatrix,
            threshold: threshold
        })
    );
    return true;
}

/**
 * Calculates the average transition probability from a given line through a given log probability matrix.
 * @param line The input string to calculate the average transition probability for.
 * @param log_prob_matrix The log probability matrix to use for the calculation.
 * @returns The average transition probability from the given line through the log probability matrix.
 */
function averageTransitionProbability(line: string, logProbMatrix: number[][]): number {
    //Return the average transition prob from line through log_prob_mat.
    let logProb = 1.0;
    let transitionCt = 0;

    const filteredLine = normalize(line);
    let a: boolean | string = false;

    for (const b in filteredLine) {
        if (a !== false) {
            logProb += logProbMatrix[pos[a]][pos[filteredLine[b]]];
            transitionCt += 1;
        }
        a = filteredLine[b];
    }

    return Math.exp(logProb / (transitionCt || 1));
}

let modelData: { matrix?: number[][]; threshold?: number } = {};

try {
    if (!existsSync(join(resRoot, modelFile))) {
        train();
    }
    modelData = JSON.parse(readFileSync(join(resRoot, modelFile)).toString("utf8"));
} catch (e) {
    console.log(e);
}

/**
 * Main function for detecting if a string contains gibberish
 * @param line The string to detect gibberish in
 * @returns True if the string is gibberish, false otherwise
 */
export default function (line: string) {
    if (!modelData || !modelData.matrix || !modelData.threshold) {
        return;
    }

    return averageTransitionProbability(line, modelData.matrix) > modelData.threshold;
}
