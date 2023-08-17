import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { GetResFolder } from "../../Ulquiorra.js";

const resRoot = join(GetResFolder(), "gibberish");

const accepted_chars = "abcdefghijklmnopqrstuvwxyz ";

const k = accepted_chars.length;

const pos = {};

for (let i = 0; i < k; i++) {
	pos[accepted_chars[i]] = i;
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
		return accepted_chars.indexOf(item) > -1;
	});
}

function train() {
	//Assume we have seen 10 of each character pair.  This acts as a kind of
	//prior or smoothing factor.  This way, if we see a character transition
	//live that we've never observed in the past, we won't assume the entire
	//string has 0 probability.
	const log_prob_matrix = [];

	for (let i = 0; i < k; i++) {
		const temp = [];
		for (let j = 0; j < k; j++) {
			temp.push(10);
		}
		log_prob_matrix.push(temp);
	}

	//Count transitions from big text file, taken
	//from http://norvig.com/spell-correct.html
	const lines = readFileSync(join(resRoot, trainFile)).toString("utf8").split("\n");
	//
	for (const key in lines) {
		//Return all n grams from l after normalizing
		const filtered_line = normalize(lines[key]);
		let a: boolean | string = false;
		for (const b in filtered_line) {
			if (a !== false) {
				log_prob_matrix[pos[a]][pos[filtered_line[b]]] += 1;
			}
			a = filtered_line[b];
		}
	}

	//Normalize the counts so that they become log probabilities.
	//We use log probabilities rather than straight probabilities to avoid
	//numeric underflow issues with long texts.
	//This contains a justification:
	//http://squarecog.wordpress.com/2009/01/10/dealing-with-underflow-in-joint-probability-calculations/
	for (const i in log_prob_matrix) {
		const s = log_prob_matrix[i].reduce(function (a, b) {
			return a + b;
		});
		for (const j in log_prob_matrix[i]) {
			log_prob_matrix[i][j] = Math.log(log_prob_matrix[i][j] / s);
		}
	}

	//Find the probability of generating a few arbitrarily choosen good and
	//bad phrases.
	const good_lines = readFileSync(join(resRoot, goodFile)).toString("utf8").split("\n");
	const good_probs = [];
	for (const key in good_lines) {
		good_probs.push(averageTransitionProbability(good_lines[key], log_prob_matrix));
	}

	const bad_lines = readFileSync(join(resRoot, badFile)).toString("utf8").split("\n");
	const bad_probs = new Array<number>();
	for (const key in bad_lines) {
		bad_probs.push(averageTransitionProbability(bad_lines[key], log_prob_matrix));
	}

	//Assert that we actually are capable of detecting the junk.
	const min_good_probs = Math.min.apply(null, good_probs);
	const max_bad_probs = Math.max.apply(null, bad_probs);
	if (min_good_probs <= max_bad_probs) {
		return false;
	}

	//And pick a threshold halfway between the worst good and best bad inputs.
	const threshold = (min_good_probs + max_bad_probs) / 2;

	console.log("good", good_probs);
	console.log("bad", bad_probs);
	console.log("th", threshold);

	//save matrix
	writeFileSync(
		join(resRoot, modelFile),
		JSON.stringify({
			matrix: log_prob_matrix,
			threshold: threshold,
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
function averageTransitionProbability(line: string, log_prob_matrix: number[][]): number {
	//Return the average transition prob from line through log_prob_mat.
	let log_prob = 1.0;
	let transition_ct = 0;

	const filtered_line = normalize(line);
	let a: boolean | string = false;

	for (const b in filtered_line) {
		if (a !== false) {
			log_prob += log_prob_matrix[pos[a]][pos[filtered_line[b]]];
			transition_ct += 1;
		}
		a = filtered_line[b];
	}

	return Math.exp(log_prob / (transition_ct || 1));
}

let model_data: { matrix?: number[][]; threshold?: number } = {};

try {
	if (!existsSync(join(resRoot, modelFile))) train();
	model_data = JSON.parse(readFileSync(join(resRoot, modelFile)).toString("utf8"));
} catch (e) {
	console.log(e);
}

/**
 * Main function for detecting if a string contains gibberish
 * @param line The string to detect gibberish in
 * @returns True if the string is gibberish, false otherwise
 */
export default function (line: string) {
	return averageTransitionProbability(line, model_data.matrix) > model_data.threshold;
}
